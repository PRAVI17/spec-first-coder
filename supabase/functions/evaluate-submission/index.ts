import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.77.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { submissionId, code, language, testCases, contestId, problemId } = await req.json();
    
    const JUDGE0_API_KEY = Deno.env.get('JUDGE0_API_KEY');
    const JUDGE0_API_URL = Deno.env.get('JUDGE0_API_URL');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!JUDGE0_API_KEY || !JUDGE0_API_URL) {
      throw new Error('Judge0 credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Language ID mapping for Judge0
    const languageIds: Record<string, number> = {
      javascript: 63,
      python: 71,
      java: 62,
      cpp: 54,
      c: 50,
    };

    const languageId = languageIds[language];
    if (!languageId) {
      throw new Error(`Unsupported language: ${language}`);
    }

    console.log(`Evaluating submission ${submissionId} with ${testCases.length} test cases`);

    let passedCount = 0;
    const results = [];

    // Evaluate each test case
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      
      try {
        // Submit to Judge0
        const submitResponse = await fetch(`${JUDGE0_API_URL}/submissions?base64_encoded=false&wait=true`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': JUDGE0_API_KEY,
          },
          body: JSON.stringify({
            source_code: code,
            language_id: languageId,
            stdin: testCase.input,
            expected_output: testCase.output.trim(),
          }),
        });

        if (!submitResponse.ok) {
          console.error(`Judge0 submission failed for test case ${i}:`, await submitResponse.text());
          results.push({ passed: false, error: 'Submission failed' });
          continue;
        }

        const result = await submitResponse.json();
        console.log(`Test case ${i} result:`, result.status.description);

        const passed = result.status.id === 3; // Accepted
        if (passed) passedCount++;

        results.push({
          passed,
          status: result.status.description,
          output: result.stdout?.trim() || '',
          error: result.stderr || result.compile_output || null,
          time: result.time,
          memory: result.memory,
        });

      } catch (error) {
        console.error(`Error evaluating test case ${i}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ passed: false, error: errorMessage });
      }
    }

    const finalStatus = passedCount === testCases.length ? 'accepted' : 
                       passedCount > 0 ? 'wrong_answer' : 'wrong_answer';

    console.log(`Final status: ${finalStatus}, Test cases passed: ${passedCount}/${testCases.length}`);

    // Get problem points from contest_problems table
    const { data: contestProblem, error: cpError } = await supabase
      .from('contest_problems')
      .select('points')
      .eq('contest_id', contestId)
      .eq('problem_id', problemId)
      .single();

    if (cpError) {
      console.error('Error fetching contest problem:', cpError);
    }

    // Calculate score based on test cases passed
    const maxPoints = contestProblem?.points || 100;
    const calculatedScore = Math.round((passedCount / testCases.length) * maxPoints);

    console.log(`Calculated score: ${calculatedScore}/${maxPoints} points`);

    // Update submission in database
    const { error: updateError } = await supabase
      .from('submissions')
      .update({
        status: finalStatus,
        test_cases_passed: passedCount,
        score: calculatedScore,
      })
      .eq('id', submissionId);

    if (updateError) {
      console.error('Error updating submission:', updateError);
    }

    return new Response(
      JSON.stringify({
        submissionId,
        status: finalStatus,
        passedCount,
        totalTestCases: testCases.length,
        score: calculatedScore,
        maxPoints,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in evaluate-submission:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
