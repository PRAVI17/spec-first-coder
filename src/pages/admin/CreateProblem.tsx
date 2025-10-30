import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TestCase {
  input: string;
  output: string;
  isHidden: boolean;
}

export default function CreateProblem() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'easy' as 'easy' | 'medium' | 'hard',
    constraints: '',
    input_format: '',
    output_format: '',
    sample_input: '',
    sample_output: '',
    time_limit: 2000,
    memory_limit: 256,
  });
  const [testCases, setTestCases] = useState<TestCase[]>([
    { input: '', output: '', isHidden: false }
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('problems')
        .insert([
          {
            ...formData,
            test_cases: testCases as any,
          }
        ]);

      if (error) throw error;

      toast({
        title: 'Problem created',
        description: 'The problem has been created successfully.',
      });
      navigate('/admin/problems');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addTestCase = () => {
    setTestCases([...testCases, { input: '', output: '', isHidden: true }]);
  };

  const removeTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: any) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: value };
    setTestCases(updated);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/admin/problems')} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Problems
          </Button>
          <h1 className="text-3xl font-bold mb-2">Create New Problem</h1>
          <p className="text-muted-foreground">Add a new coding problem to the bank</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Problem Title</Label>
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
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={6}
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value: any) => setFormData({ ...formData, difficulty: value })}
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Format & Constraints</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="input_format">Input Format</Label>
                <Textarea
                  id="input_format"
                  value={formData.input_format}
                  onChange={(e) => setFormData({ ...formData, input_format: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="output_format">Output Format</Label>
                <Textarea
                  id="output_format"
                  value={formData.output_format}
                  onChange={(e) => setFormData({ ...formData, output_format: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="constraints">Constraints</Label>
                <Textarea
                  id="constraints"
                  value={formData.constraints}
                  onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sample Test Case</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sample_input">Sample Input</Label>
                <Textarea
                  id="sample_input"
                  value={formData.sample_input}
                  onChange={(e) => setFormData({ ...formData, sample_input: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sample_output">Sample Output</Label>
                <Textarea
                  id="sample_output"
                  value={formData.sample_output}
                  onChange={(e) => setFormData({ ...formData, sample_output: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Test Cases</CardTitle>
              <Button type="button" onClick={addTestCase} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Test Case
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {testCases.map((testCase, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold">Test Case {index + 1}</h4>
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
                  <div className="space-y-2">
                    <Label>Input</Label>
                    <Textarea
                      value={testCase.input}
                      onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expected Output</Label>
                    <Textarea
                      value={testCase.output}
                      onChange={(e) => updateTestCase(index, 'output', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Problem'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/admin/problems')}>
              Cancel
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
