import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function CreateProblem() {
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
  });
  const [testCases, setTestCases] = useState<TestCase[]>([{ input: '', output: '' }]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from('problems').insert({
      ...formData,
      test_cases: testCases as any,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create problem',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Problem created successfully',
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
            <CardTitle>Create New Problem</CardTitle>
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

              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Problem'}
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
