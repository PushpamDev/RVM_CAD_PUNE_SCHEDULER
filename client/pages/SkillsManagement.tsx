import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { API_BASE_URL } from "@/lib/api";
import { MoreHorizontal } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
}

export default function SkillsManagement() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [newSkill, setNewSkill] = useState({ name: "", category: "", description: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSkills = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/skills`);
      const data = await response.json();
      setSkills(data);
    } catch (error) {
      console.error("Error fetching skills:", error);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setNewSkill((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    const skillData = editingSkill ? { ...editingSkill, ...newSkill } : newSkill;
    if (skillData.name.trim()) {
      setIsSaving(true);
      try {
        const url = editingSkill
          ? `${API_BASE_URL}/api/skills/${editingSkill.id}`
          : `${API_BASE_URL}/api/skills`;
        const method = editingSkill ? "PUT" : "POST";

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(skillData),
        });

        if (response.ok) {
          fetchSkills(); // Refresh the list
          setNewSkill({ name: "", category: "", description: "" }); // Reset form
          setEditingSkill(null);
          setDialogOpen(false); // Close dialog
        } else {
          console.error("Failed to save skill");
        }
      } catch (error) {
        console.error("Error saving skill:", error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleEdit = (skill: Skill) => {
    setEditingSkill(skill);
    setNewSkill({ name: skill.name, category: skill.category, description: skill.description });
    setDialogOpen(true);
  };

  const handleDelete = async (skillId: string) => {
    if (window.confirm("Are you sure you want to delete this skill?")) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/skills/${skillId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          fetchSkills(); // Refresh the list
        } else {
          console.error("Failed to delete skill");
        }
      } catch (error) {
        console.error("Error deleting skill:", error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Skills Management
          </h1>
          <p className="text-muted-foreground">
            Manage the skills and subjects that can be taught in your institute.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(isOpen) => {
          setDialogOpen(isOpen);
          if (!isOpen) {
            setEditingSkill(null);
            setNewSkill({ name: "", category: "", description: "" });
          }
        }}>
          <DialogTrigger asChild>
            <Button>Add Skill</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSaveSkill}>
              <DialogHeader>
                <DialogTitle>{editingSkill ? "Edit Skill" : "Add New Skill"}</DialogTitle>
                <DialogDescription>
                  {editingSkill ? "Update the details of the skill." : "Fill in the details to add a new skill."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    className="col-span-3"
                    value={newSkill.name}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">
                    Category
                  </Label>
                  <Input
                    id="category"
                    className="col-span-3"
                    value={newSkill.category}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Input
                    id="description"
                    className="col-span-3"
                    value={newSkill.description}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Skill"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Skills & Subjects</CardTitle>
          <CardDescription>
            A list of all the skills and subjects offered by your institute.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skills.map((skill) => (
                <TableRow key={skill.id}>
                  <TableCell className="font-medium">{skill.name}</TableCell>
                  <TableCell>{skill.category}</TableCell>
                  <TableCell>{skill.description}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(skill)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(skill.id)}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}