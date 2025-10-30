import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TestCase {
  input: string;
  output: string;
}

export default function EditProblem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    constraints: '',
    input_format: '',
    output_format: '',
    sample_input: '',
    sample_output: '',
    time_limit: 2000,
    memory_limit: 256,
    boilerplate_javascript: '',
    boilerplate_python: '',
    boilerplate_java: '',
    boilerplate_cpp: '',
    boilerplate_c: '',
  });
  const [testCases, setTestCases] = useState<TestCase[]>([{ input: '', output: '' }]);

  const { data: problem, isLoading } = useQuery({
    queryKey: ['problem', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('problems')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (problem) {
      setFormData({
        title: problem.title,
        description: problem.description,
        difficulty: problem.difficulty,
        constraints: problem.constraints || '',
        input_format: problem.input_format || '',
        output_format: problem.output_format || '',
        sample_input: problem.sample_input || '',
        sample_output: problem.sample_output || '',
        time_limit: problem.time_limit,
        memory_limit: problem.memory_limit,
        boilerplate_javascript: (problem as any).boilerplate_javascript || '',
        boilerplate_python: (problem as any).boilerplate_python || '',
        boilerplate_java: (problem as any).boilerplate_java || '',
        boilerplate_cpp: (problem as any).boilerplate_cpp || '',
        boilerplate_c: (problem as any).boilerplate_c || '',
      });
      
      if (problem.test_cases && Array.isArray(problem.test_cases) && problem.test_cases.length > 0) {
        setTestCases(problem.test_cases as any as TestCase[]);
      }
    }
  }, [problem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('problems')
      .update({
        ...formData,
        test_cases: testCases as any,
      })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update problem',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Problem updated successfully',
      });
      navigate('/admin/problems');
    }

    setLoading(false);
  };

  const addTestCase = () => {
    setTestCases([...testCases, { input: '', output: '' }]);
  };

  const removeTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const updateTestCase = (index: number, field: 'input' | 'output', value: string) => {
    const updated = [...testCases];
    updated[index][field] = value;
    setTestCases(updated);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/admin/problems">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Problems
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Edit Problem</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={6}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value: 'easy' | 'medium' | 'hard') =>
                      setFormData({ ...formData, difficulty: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time_limit">Time Limit (ms)</Label>
                  <Input
                    id="time_limit"
                    type="number"
                    value={formData.time_limit}
                    onChange={(e) => setFormData({ ...formData, time_limit: parseInt(e.target.value) })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="memory_limit">Memory Limit (MB)</Label>
                  <Input
                    id="memory_limit"
                    type="number"
                    value={formData.memory_limit}
                    onChange={(e) => setFormData({ ...formData, memory_limit: parseInt(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="constraints">Constraints</Label>
                <Textarea
                  id="constraints"
                  rows={3}
                  value={formData.constraints}
                  onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="input_format">Input Format</Label>
                  <Textarea
                    id="input_format"
                    rows={3}
                    value={formData.input_format}
                    onChange={(e) => setFormData({ ...formData, input_format: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="output_format">Output Format</Label>
                  <Textarea
                    id="output_format"
                    rows={3}
                    value={formData.output_format}
                    onChange={(e) => setFormData({ ...formData, output_format: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sample_input">Sample Input</Label>
                  <Textarea
                    id="sample_input"
                    rows={3}
                    value={formData.sample_input}
                    onChange={(e) => setFormData({ ...formData, sample_input: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sample_output">Sample Output</Label>
                  <Textarea
                    id="sample_output"
                    rows={3}
                    value={formData.sample_output}
                    onChange={(e) => setFormData({ ...formData, sample_output: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Test Cases</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addTestCase}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Test Case
                  </Button>
                </div>

                {testCases.map((testCase, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-center mb-4">
                        <Label>Test Case {index + 1}</Label>
                        {testCases.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTestCase(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Input</Label>
                          <Textarea
                            value={testCase.input}
                            onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                            rows={3}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Expected Output</Label>
                          <Textarea
                            value={testCase.output}
                            onChange={(e) => updateTestCase(index, 'output', e.target.value)}
                            rows={3}
                            required
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-4">
                <Label>Boilerplate Code (Optional)</Label>
                <p className="text-sm text-muted-foreground">Provide starter code for each language</p>
                
                <div className="space-y-2">
                  <Label htmlFor="boilerplate_javascript">JavaScript</Label>
                  <Textarea
                    id="boilerplate_javascript"
                    rows={4}
                    placeholder="// JavaScript starter code"
                    value={formData.boilerplate_javascript}
                    onChange={(e) => setFormData({ ...formData, boilerplate_javascript: e.target.value })}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="boilerplate_python">Python</Label>
                  <Textarea
                    id="boilerplate_python"
                    rows={4}
                    placeholder="# Python starter code"
                    value={formData.boilerplate_python}
                    onChange={(e) => setFormData({ ...formData, boilerplate_python: e.target.value })}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="boilerplate_java">Java</Label>
                  <Textarea
                    id="boilerplate_java"
                    rows={4}
                    placeholder="// Java starter code"
                    value={formData.boilerplate_java}
                    onChange={(e) => setFormData({ ...formData, boilerplate_java: e.target.value })}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="boilerplate_cpp">C++</Label>
                  <Textarea
                    id="boilerplate_cpp"
                    rows={4}
                    placeholder="// C++ starter code"
                    value={formData.boilerplate_cpp}
                    onChange={(e) => setFormData({ ...formData, boilerplate_cpp: e.target.value })}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="boilerplate_c">C</Label>
                  <Textarea
                    id="boilerplate_c"
                    rows={4}
                    placeholder="// C starter code"
                    value={formData.boilerplate_c}
                    onChange={(e) => setFormData({ ...formData, boilerplate_c: e.target.value })}
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Problem'}
                </Button>
                <Link to="/admin/problems">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
