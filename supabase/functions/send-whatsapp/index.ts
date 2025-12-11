import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppRequest {
  studentName: string;
  rollNo: number;
  contact: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentName, rollNo, contact }: WhatsAppRequest = await req.json();

    if (!studentName || !rollNo || !contact) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Clean the phone number - remove spaces, dashes, and ensure format
    const cleanedPhone = contact.replace(/[\s\-\(\)]/g, '');
    
    // Message to send
    const message = `Your child ${studentName}, roll no ${rollNo}, is Absent today.`;
    
    // Try to use WhatsApp API
    // Check if we have any WhatsApp API configured
    const greenApiInstance = Deno.env.get('GREEN_API_INSTANCE');
    const greenApiToken = Deno.env.get('GREEN_API_TOKEN');
    const ultraMsgInstance = Deno.env.get('ULTRAMSG_INSTANCE');
    const ultraMsgToken = Deno.env.get('ULTRAMSG_TOKEN');

    let apiResponse = null;
    let apiUsed = 'none';

    // Try Green API first
    if (greenApiInstance && greenApiToken) {
      try {
        const response = await fetch(
          `https://api.green-api.com/waInstance${greenApiInstance}/sendMessage/${greenApiToken}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId: `${cleanedPhone}@c.us`,
              message: message,
            }),
          }
        );
        apiResponse = await response.json();
        apiUsed = 'green-api';
        console.log('Green API response:', apiResponse);
      } catch (error) {
        console.error('Green API error:', error);
      }
    }
    
    // Try UltraMSG if Green API didn't work
    if (!apiResponse && ultraMsgInstance && ultraMsgToken) {
      try {
        const params = new URLSearchParams();
        params.append('token', ultraMsgToken);
        params.append('to', cleanedPhone);
        params.append('body', message);
        
        const response = await fetch(
          `https://api.ultramsg.com/${ultraMsgInstance}/messages/chat`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params,
          }
        );
        apiResponse = await response.json();
        apiUsed = 'ultramsg';
        console.log('UltraMSG response:', apiResponse);
      } catch (error) {
        console.error('UltraMSG error:', error);
      }
    }

    // If no API configured, log the message
    if (!apiResponse) {
      console.log(`WhatsApp notification would be sent to ${contact}:`);
      console.log(`Message: ${message}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'WhatsApp API not configured. Message logged.',
          details: {
            to: contact,
            content: message,
            note: 'Configure GREEN_API or ULTRAMSG secrets to enable actual WhatsApp messaging'
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `WhatsApp notification sent via ${apiUsed}`,
        response: apiResponse 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('Error sending WhatsApp:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send WhatsApp notification',
        details: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
