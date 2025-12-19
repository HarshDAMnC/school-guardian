import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, UserCircle, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Student {
  roll_no: number;
  name: string;
  class: string;
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({ roll_no: '', name: '', class: '' });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('roll_no');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch students', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStudent && (!formData.roll_no.trim() || isNaN(Number(formData.roll_no)))) {
      toast({ title: 'Validation Error', description: 'Please enter a valid roll number', variant: 'destructive' });
      return;
    }

    if (!formData.name.trim() || !formData.class.trim()) {
      toast({ title: 'Validation Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }

    try {
      if (selectedStudent) {
        const { error } = await supabase
          .from('students')
          .update({ name: formData.name.trim(), class: formData.class.trim() })
          .eq('roll_no', selectedStudent.roll_no);

        if (error) throw error;
        toast({ title: 'Success', description: 'Student updated successfully' });
      } else {
        const { error } = await supabase
          .from('students')
          .insert({ 
            roll_no: Number(formData.roll_no), 
            name: formData.name.trim(), 
            class: formData.class.trim(),
            is_enrolled: false,
            identifier_code: Number(formData.roll_no)
          });

        if (error) throw error;
        toast({ title: 'Success', description: 'Student added successfully' });
      }

      setIsDialogOpen(false);
      setSelectedStudent(null);
      setFormData({ roll_no: '', name: '', class: '' });
      fetchStudents();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!selectedStudent) return;

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('roll_no', selectedStudent.roll_no);

      if (error) throw error;
      toast({ title: 'Success', description: 'Student and all related data deleted' });
      setIsDeleteOpen(false);
      setSelectedStudent(null);
      fetchStudents();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const openEdit = (student: Student) => {
    setSelectedStudent(student);
    setFormData({ roll_no: String(student.roll_no), name: student.name, class: student.class });
    setIsDialogOpen(true);
  };

  const openAdd = () => {
    setSelectedStudent(null);
    setFormData({ roll_no: '', name: '', class: '' });
    setIsDialogOpen(true);
  };

  const openDelete = (student: Student) => {
    setSelectedStudent(student);
    setIsDeleteOpen(true);
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.class.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.roll_no.toString().includes(searchQuery)
  );

  return (
    <DashboardLayout>
      <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-description">Manage student records and information</p>
        </div>
        <Button onClick={openAdd} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" /> Add Student
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, class or roll no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border bg-card text-center">
          <p className="text-lg font-medium">No students found</p>
          <p className="text-muted-foreground">Add your first student to get started</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Name</th>
                <th>Class</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.roll_no} className="animate-fade-in">
                  <td className="font-medium">{student.roll_no}</td>
                  <td>{student.name}</td>
                  <td>{student.class}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link to={`/parents?roll_no=${student.roll_no}`}>
                        <Button variant="ghost" size="icon" className="btn-icon" title="View Parent">
                          <UserCircle className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link to={`/yearly-attendance?roll_no=${student.roll_no}`}>
                        <Button variant="ghost" size="icon" className="btn-icon" title="View Attendance">
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="btn-icon" onClick={() => openEdit(student)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="btn-icon text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => openDelete(student)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
            <DialogDescription>
              {selectedStudent ? 'Update student information' : 'Enter student details below'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {!selectedStudent && (
                <div className="space-y-2">
                  <Label htmlFor="roll_no">Roll Number</Label>
                  <Input
                    id="roll_no"
                    type="number"
                    placeholder="Enter roll number"
                    value={formData.roll_no}
                    onChange={(e) => setFormData({ ...formData, roll_no: e.target.value })}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter student name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <Input
                  id="class"
                  placeholder="e.g., 10-A"
                  value={formData.class}
                  onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                  maxLength={20}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{selectedStudent ? 'Update' : 'Add'} Student</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedStudent?.name} (Roll No: {selectedStudent?.roll_no}) and all
              associated parent details and attendance records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
