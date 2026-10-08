
"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/lib/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/lib/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/lib/components/ui/dialog";
import { Input } from "@/lib/components/ui/input";
import { Label } from "@/lib/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/lib/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/lib/components/ui/table";

import {
  createClassSchema,
  classNameMatchesYear,
  createSubjectSchema,
} from "@/schemas/referenceDataSchema";

interface Subject {
  id: string;
  code: string;
  name: string;
  year: number;
  semester: number;
}

interface ClassRecord {
  id: string;
  name: string;
  year: number;
}

type SubjectForm = Omit<Subject, "id">;
type ClassForm = Omit<ClassRecord, "id">;

const emptySubject: SubjectForm = {
  code: "",
  name: "",
  year: 1,
  semester: 1,
};

const emptyClass: ClassForm = {
  name: "",
  year: 1,
};

function normalizeClassName(name: string) {
  return name.trim().toUpperCase();
}

const academicYears = [1, 2, 3];

async function readError(response: Response) {
  try {
    const data = (await response.json()) as {
      error?: string;
    };

    return data.error ?? "An unexpected error occurred";
  } catch {
    return "An unexpected error occurred";
  }
}

export function ReferenceDataTab() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const [subjectDialogOpen, setSubjectDialogOpen] =
    useState(false);
  const [editingSubject, setEditingSubject] =
    useState<Subject | null>(null);
  const [subjectForm, setSubjectForm] =
    useState<SubjectForm>(emptySubject);

  const [classDialogOpen, setClassDialogOpen] =
    useState(false);
  const [editingClass, setEditingClass] =
    useState<ClassRecord | null>(null);
  const [classForm, setClassForm] =
    useState<ClassForm>(emptyClass);
  const [classYearChosenFirst, setClassYearChosenFirst] = useState(false);
  const [classNameWarning, setClassNameWarning] = useState<string | null>(null);

  const subjectValidation =
    createSubjectSchema.safeParse(subjectForm);

  const classValidation =
    createClassSchema.safeParse(classForm);

  const subjectAlreadyExists = subjects.some(
    (subject) =>
      subject.code.trim().toUpperCase() ===
        subjectForm.code.trim().toUpperCase() &&
      subject.id !== editingSubject?.id,
  );

  const classYearMatches = classNameMatchesYear(classForm.name, classForm.year);

  const classAlreadyExists = classes.some(
    (classRecord) =>
      normalizeClassName(classRecord.name) ===
        normalizeClassName(classForm.name) &&
      classRecord.id !== editingClass?.id,
  );

  const subjectHasChanges =
    !editingSubject ||
    subjectForm.code.trim() !== editingSubject.code.trim() ||
    subjectForm.name.trim() !== editingSubject.name.trim() ||
    subjectForm.year !== editingSubject.year ||
    subjectForm.semester !== editingSubject.semester;

  const classHasChanges =
    !editingClass ||
    classForm.name.trim() !== editingClass.name.trim() ||
    classForm.year !== editingClass.year;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [subjectsResponse, classesResponse] =
        await Promise.all([
          fetch("/api/subjects"),
          fetch("/api/classes"),
        ]);

      if (!subjectsResponse.ok) {
        throw new Error(
          await readError(subjectsResponse),
        );
      }

      if (!classesResponse.ok) {
        throw new Error(
          await readError(classesResponse),
        );
      }

      const [subjectsData, classesData] =
        await Promise.all([
          subjectsResponse.json() as Promise<Subject[]>,
          classesResponse.json() as Promise<ClassRecord[]>,
        ]);

      setSubjects(subjectsData);
      setClasses(classesData);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load reference data",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function openNewSubject() {
    setEditingSubject(null);
    setSubjectForm(emptySubject);
    setError(null);
    setDialogError(null);
    setSubjectDialogOpen(true);
  }

  function openEditSubject(subject: Subject) {
    setEditingSubject(subject);
    setSubjectForm({
      code: subject.code,
      name: subject.name,
      year: subject.year,
      semester: subject.semester,
    });
    setError(null);
    setDialogError(null);
    setSubjectDialogOpen(true);
  }

  function openNewClass() {
    setEditingClass(null);
    setClassForm(emptyClass);
    setClassYearChosenFirst(false);
    setClassNameWarning(null);
    setError(null);
    setDialogError(null);
    setClassDialogOpen(true);
  }

  function openEditClass(classRecord: ClassRecord) {
    setEditingClass(classRecord);
    setClassForm({
      name: classRecord.name,
      year: classRecord.year,
    });
    setClassYearChosenFirst(false);
    setClassNameWarning(null);
    setError(null);
    setDialogError(null);
    setClassDialogOpen(true);
  }

  async function saveSubject() {
    if (
      !subjectValidation.success ||
      subjectAlreadyExists ||
      !subjectHasChanges ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setDialogError(null);

    try {
      const response = await fetch("/api/subjects", {
        method: editingSubject ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          editingSubject
            ? {
                id: editingSubject.id,
                ...subjectValidation.data,
              }
            : subjectValidation.data,
        ),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setSubjectDialogOpen(false);
      await loadData();
    } catch (saveError) {
      setDialogError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save subject",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveClass() {
    if (
      !classValidation.success ||
      !classYearMatches ||
      classNameWarning !== null ||
      classAlreadyExists ||
      !classHasChanges ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setDialogError(null);

    try {
      const response = await fetch("/api/classes", {
        method: editingClass ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          editingClass
            ? {
                id: editingClass.id,
                ...classValidation.data,
              }
            : classValidation.data,
        ),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setClassDialogOpen(false);
      await loadData();
    } catch (saveError) {
      setDialogError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save class",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteSubject(subject: Subject) {
    if (
      !window.confirm(
        `Delete subject ${subject.code}?`,
      )
    ) {
      return;
    }

    setError(null);

    try {
      const response = await fetch("/api/subjects", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: subject.id,
        }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete subject",
      );
    }
  }

  async function deleteClass(classRecord: ClassRecord) {
    if (
      !window.confirm(
        `Delete class ${classRecord.name}?`,
      )
    ) {
      return;
    }

    setError(null);

    try {
      const response = await fetch("/api/classes", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: classRecord.id,
        }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete class",
      );
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="text-muted-foreground p-8 text-center">
          Loading reference data...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Subjects</CardTitle>

            <Button size="sm" onClick={openNewSubject}>
              <Plus />
              Add Subject
            </Button>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {subjects.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell className="font-medium">
                      {subject.code}
                    </TableCell>

                    <TableCell>
                      {subject.name}
                    </TableCell>

                    <TableCell>
                      {subject.year}
                    </TableCell>

                    <TableCell>
                      {subject.semester}
                    </TableCell>

                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={`Edit ${subject.code}`}
                          onClick={() =>
                            openEditSubject(subject)
                          }
                        >
                          <Pencil />
                        </Button>

                        <Button
                          variant="destructive"
                          size="icon"
                          aria-label={`Delete ${subject.code}`}
                          onClick={() =>
                            void deleteSubject(subject)
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {subjects.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-muted-foreground text-center"
                    >
                      No subjects found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Classes</CardTitle>

            <Button size="sm" onClick={openNewClass}>
              <Plus />
              Add Class
            </Button>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {classes.map((classRecord) => (
                  <TableRow key={classRecord.id}>
                    <TableCell className="font-medium">
                      {classRecord.name}
                    </TableCell>

                    <TableCell>
                      {classRecord.year}
                    </TableCell>

                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={`Edit ${classRecord.name}`}
                          onClick={() =>
                            openEditClass(classRecord)
                          }
                        >
                          <Pencil />
                        </Button>

                        <Button
                          variant="destructive"
                          size="icon"
                          aria-label={`Delete ${classRecord.name}`}
                          onClick={() =>
                            void deleteClass(classRecord)
                          }
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}

                {classes.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-muted-foreground text-center"
                    >
                      No classes found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={subjectDialogOpen}
        onOpenChange={setSubjectDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSubject
                ? "Edit Subject"
                : "Add Subject"}
            </DialogTitle>

            <DialogDescription>
              Manage the subject reference data used by
              swap requests.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="subject-code">
                Code
              </Label>

              <Input
                id="subject-code"
                value={subjectForm.code}
                onChange={(event) =>
                  setSubjectForm((current) => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subject-name">
                Name
              </Label>

              <Input
                id="subject-name"
                value={subjectForm.name}
                onChange={(event) =>
                  setSubjectForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>

            {subjectAlreadyExists && (
              <p
                role="alert"
                className="text-sm text-destructive"
              >
                A subject with this code already exists.
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Year</Label>

                <Select
                  value={String(subjectForm.year)}
                  onValueChange={(value) =>
                    setSubjectForm((current) => ({
                      ...current,
                      year: Number(value),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {academicYears.map((year) => (
                      <SelectItem
                        key={year}
                        value={String(year)}
                      >
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Semester</Label>

                <Select
                  value={String(subjectForm.semester)}
                  onValueChange={(value) =>
                    setSubjectForm((current) => ({
                      ...current,
                      semester: Number(value),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {[1, 2].map((semester) => (
                      <SelectItem
                        key={semester}
                        value={String(semester)}
                      >
                        {semester}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {dialogError && (
            <p role="alert" className="text-sm text-destructive">
              {dialogError}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setSubjectDialogOpen(false)
              }
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              onClick={() => void saveSubject()}
              disabled={
                saving ||
                !subjectValidation.success ||
                subjectAlreadyExists ||
                !subjectHasChanges
              }
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={classDialogOpen}
        onOpenChange={setClassDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingClass
                ? "Edit Class"
                : "Add Class"}
            </DialogTitle>

            <DialogDescription>
              Manage the class reference data used by
              swap requests.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="class-name">
                Name
              </Label>

              <Input
                id="class-name"
                value={classForm.name}
                onChange={(event) => {
                  const nextName = event.target.value;
                  const firstCharacter = nextName.trim().charAt(0);

                  if (!nextName.trim()) {
                    setClassForm((current) => ({ ...current, name: nextName }));
                    setClassNameWarning(null);
                    return;
                  }

                  if (!/^[1-3]$/.test(firstCharacter)) {
                    setClassNameWarning("Class name must start with 1, 2, or 3.");
                    return;
                  }

                  if (classYearChosenFirst && Number(firstCharacter) !== classForm.year) {
                    setClassNameWarning(`Class name must start with ${classForm.year}.`);
                    return;
                  }

                  setClassNameWarning(null);
                  setClassForm((current) => ({
                    name: nextName,
                    year: classYearChosenFirst ? current.year : Number(firstCharacter),
                  }));
                }}
              />

              {(classNameWarning || (classForm.name.trim() && !classYearMatches)) && (
                <p role="alert" className="text-sm text-destructive">
                  {classNameWarning ?? `Class name must start with ${classForm.year}.`}
                </p>
              )}

              {classAlreadyExists && (
                <p
                  role="alert"
                  className="text-sm text-destructive"
                >
                  A class with this name already exists.
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Year</Label>

              <Select
                value={String(classForm.year)}
                onValueChange={(value) => {
                  if (classForm.name.trim()) return;
                  setClassYearChosenFirst(true);
                  setClassNameWarning(null);
                  setClassForm((current) => ({
                    ...current,
                    year: Number(value),
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem
                      key={year}
                      value={String(year)}
                      disabled={Boolean(classForm.name.trim()) && year !== classForm.year}
                    >
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {dialogError && (
            <p role="alert" className="text-sm text-destructive">
              {dialogError}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setClassDialogOpen(false)
              }
              disabled={saving}
            >
              Cancel
            </Button>

            <Button
              onClick={() => void saveClass()}
              disabled={
                saving ||
                !classValidation.success ||
                classAlreadyExists ||
                !classYearMatches ||
                classNameWarning !== null ||
                !classHasChanges
              }
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
