import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const body = await req.json()
    const { roll_no, status, message } = body

    console.log(`Received confirmation for roll_no: ${roll_no}, status: ${status}, message: ${message}`)

    if (!roll_no) {
      return new Response(
        JSON.stringify({ error: 'roll_no is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (status === 'success') {
      // Update student to set is_enrolled = true
      const { error } = await supabase
        .from('students')
        .update({ is_enrolled: true })
        .eq('roll_no', roll_no)

      if (error) {
        console.error('Error updating student:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to update student', details: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`Successfully marked roll_no ${roll_no} as enrolled`)
      return new Response(
        JSON.stringify({ success: true, message: `Student ${roll_no} enrolled successfully` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Enrollment failed - log but don't update
      console.log(`Enrollment failed for roll_no ${roll_no}: ${message}`)
      return new Response(
        JSON.stringify({ success: false, message: `Enrollment failed: ${message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error in biometric-confirm:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
