import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

interface Parent {
  id: string;
  roll_no: number;
  parent_name: string;
  address: string | null;
  contact: string;
  student_name?: string;
}

interface Student {
  roll_no: number;
  name: string;
}

export default function Parents() {
  const [searchParams] = useSearchParams();
  const rollNoFilter = searchParams.get('roll_no');

  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [formData, setFormData] = useState({
    roll_no: '',
    parent_name: '',
    address: '',
    contact: '',
  });

  useEffect(() => {
    fetchData();
  }, [rollNoFilter]);

  const fetchData = async () => {
    try {
      // Fetch students for dropdown
      const { data: studentsData } = await supabase
        .from('students')
        .select('roll_no, name')
        .order('roll_no');

      setStudents(studentsData || []);

      // Fetch parents with student names
      let query = supabase
        .from('parents_detail')
        .select('*, students(name)')
        .order('roll_no');

      if (rollNoFilter) {
        query = query.eq('roll_no', parseInt(rollNoFilter));
      }

      const { data, error } = await query;
      if (error) throw error;

      const parentsWithNames = (data || []).map((p: any) => ({
        ...p,
        student_name: p.students?.name,
      }));

      setParents(parentsWithNames);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.roll_no || !formData.parent_name.trim() || !formData.contact.trim()) {
      toast({ title: 'Validation Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    try {
      const payload = {
        roll_no: parseInt(formData.roll_no),
        parent_name: formData.parent_name.trim(),
        address: formData.address.trim() || null,
        contact: formData.contact.trim(),
      };

      if (selectedParent) {
        const { error } = await supabase
          .from('parents_detail')
          .update(payload)
          .eq('id', selectedParent.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Parent details updated' });
      } else {
        const { error } = await supabase.from('parents_detail').insert(payload);
        if (error) throw error;
        toast({ title: 'Success', description: 'Parent details added' });
      }

      setIsDialogOpen(false);
      setSelectedParent(null);
      setFormData({ roll_no: '', parent_name: '', address: '', contact: '' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!selectedParent) return;

    try {
      const { error } = await supabase.from('parents_detail').delete().eq('id', selectedParent.id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Parent details deleted' });
      setIsDeleteOpen(false);
      setSelectedParent(null);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const openEdit = (parent: Parent) => {
    setSelectedParent(parent);
    setFormData({
      roll_no: parent.roll_no.toString(),
      parent_name: parent.parent_name,
      address: parent.address || '',
      contact: parent.contact,
    });
    setIsDialogOpen(true);
  };

  const openAdd = () => {
    setSelectedParent(null);
    setFormData({
      roll_no: rollNoFilter || '',
      parent_name: '',
      address: '',
      contact: '',
    });
    setIsDialogOpen(true);
  };

  const filteredParents = parents.filter(
    (p) =>
      p.parent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.contact.includes(searchQuery) ||
      p.roll_no.toString().includes(searchQuery) ||
      p.student_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Parent Details</h1>
          <p className="page-description">
            {rollNoFilter
              ? `Showing parent details for Roll No: ${rollNoFilter}`
              : 'Manage parent/guardian contact information'}
          </p>
        </div>
        <Button onClick={openAdd} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" /> Add Parent
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, contact or roll no..."
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
      ) : filteredParents.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border bg-card text-center">
          <p className="text-lg font-medium">No parent records found</p>
          <p className="text-muted-foreground">Add parent details for students</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Student</th>
                <th>Parent Name</th>
                <th>Contact</th>
                <th>Address</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredParents.map((parent) => (
                <tr key={parent.id} className="animate-fade-in">
                  <td className="font-medium">{parent.roll_no}</td>
                  <td>{parent.student_name}</td>
                  <td>{parent.parent_name}</td>
                  <td>{parent.contact}</td>
                  <td className="max-w-xs truncate">{parent.address || '-'}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="btn-icon" onClick={() => openEdit(parent)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="btn-icon text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          setSelectedParent(parent);
                          setIsDeleteOpen(true);
                        }}
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
            <DialogTitle>{selectedParent ? 'Edit Parent Details' : 'Add Parent Details'}</DialogTitle>
            <DialogDescription>Enter parent/guardian contact information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="roll_no">Student (Roll No)</Label>
                <Select
                  value={formData.roll_no}
                  onValueChange={(value) => setFormData({ ...formData, roll_no: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.roll_no} value={s.roll_no.toString()}>
                        {s.roll_no} - {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent_name">Parent Name *</Label>
                <Input
                  id="parent_name"
                  placeholder="Enter parent/guardian name"
                  value={formData.parent_name}
                  onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Contact Number *</Label>
                <Input
                  id="contact"
                  placeholder="e.g., +91 9876543210"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Enter address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  maxLength={255}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{selectedParent ? 'Update' : 'Add'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Parent Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the parent details for {selectedParent?.parent_name}. This action cannot be
              undone.
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
