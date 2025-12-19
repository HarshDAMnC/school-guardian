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

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find first student with is_enrolled = false
    const { data: student, error } = await supabase
      .from('students')
      .select('roll_no, identifier_code')
      .eq('is_enrolled', false)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (error || !student) {
      // No pending enrollment - return SCAN command
      console.log('No pending enrollments, returning SCAN command')
      return new Response(
        JSON.stringify({ command: 'SCAN' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Pending enrollment found - return ENROLL command
    console.log(`Pending enrollment found for roll_no: ${student.roll_no}`)
    return new Response(
      JSON.stringify({
        command: 'ENROLL',
        id: student.identifier_code || student.roll_no, // Use identifier_code if set, otherwise roll_no
        roll_no: student.roll_no
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in biometric-check:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
