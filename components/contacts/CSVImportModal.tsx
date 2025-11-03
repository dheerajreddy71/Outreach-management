"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload, FileText, X, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface CSVImportModalProps {
  onClose: () => void;
  onComplete: () => void;
}

export function CSVImportModal({ onClose, onComplete }: CSVImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [importResults, setImportResults] = useState<any>(null);

  const importMutation = useMutation({
    mutationFn: async (contacts: any[]) => {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts }),
      });
      if (!res.ok) throw new Error("Import failed");
      return res.json();
    },
    onSuccess: (data) => {
      setImportResults(data.results);
      if (data.results.failed === 0) {
        setTimeout(() => {
          onComplete();
        }, 2000);
      }
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResults(null);

    // Parse CSV
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());
      
      if (lines.length < 2) {
        alert("CSV file must have a header row and at least one data row");
        return;
      }

      // Parse header
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      
      // Parse rows
      const contacts = lines.slice(1, 6).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const contact: any = {};
        
        headers.forEach((header, index) => {
          const value = values[index];
          if (value) {
            // Map common CSV headers to our fields
            if (header.includes("first") || header === "firstname") {
              contact.firstName = value;
            } else if (header.includes("last") || header === "lastname") {
              contact.lastName = value;
            } else if (header.includes("email") || header === "e-mail") {
              contact.email = value;
            } else if (header.includes("phone") || header.includes("mobile")) {
              contact.phone = value;
            } else if (header.includes("whatsapp")) {
              contact.whatsapp = value;
            } else if (header.includes("company") || header.includes("organization")) {
              contact.company = value;
            } else if (header.includes("title") || header.includes("job") || header.includes("position")) {
              contact.jobTitle = value;
            }
          }
        });
        
        return contact;
      });

      setPreview(contacts);
    };
    
    reader.readAsText(selectedFile);
  };

  const handleImport = () => {
    if (!file) return;

    // Parse entire file
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      
      const contacts = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const contact: any = {};
        
        headers.forEach((header, index) => {
          const value = values[index];
          if (value) {
            if (header.includes("first") || header === "firstname") {
              contact.firstName = value;
            } else if (header.includes("last") || header === "lastname") {
              contact.lastName = value;
            } else if (header.includes("email") || header === "e-mail") {
              contact.email = value;
            } else if (header.includes("phone") || header.includes("mobile")) {
              contact.phone = value;
            } else if (header.includes("whatsapp")) {
              contact.whatsapp = value;
            } else if (header.includes("company") || header.includes("organization")) {
              contact.company = value;
            } else if (header.includes("title") || header.includes("job") || header.includes("position")) {
              contact.jobTitle = value;
            }
          }
        });
        
        return contact;
      });

      importMutation.mutate(contacts);
    };
    
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Import Contacts from CSV</h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload a CSV file with contact information
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* File Upload */}
          {!file && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Choose a CSV file
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                File should include columns: firstName, lastName, email, phone, company
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <FileText className="w-4 h-4" />
                  Select CSV File
                </span>
              </label>
            </div>
          )}

          {/* Preview */}
          {file && preview.length > 0 && !importResults && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
                  <p className="text-sm text-gray-600">
                    Showing first 5 rows from {file.name}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setFile(null)}>
                  Change File
                </Button>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg mb-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        First Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Last Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Phone
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Company
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.map((contact, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {contact.firstName || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {contact.lastName || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {contact.email || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {contact.phone || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {contact.company || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={importMutation.isPending}
                >
                  {importMutation.isPending ? "Importing..." : "Import All Contacts"}
                </Button>
              </div>
            </div>
          )}

          {/* Import Results */}
          {importResults && (
            <div>
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Import Complete
                  </h3>
                </div>
                <p className="text-gray-600">
                  Successfully imported {importResults.success} contacts.
                  {importResults.failed > 0 && ` ${importResults.failed} failed.`}
                </p>
              </div>

              {importResults.errors.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    Errors ({importResults.errors.length})
                  </h4>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                    {importResults.errors.slice(0, 10).map((error: any, index: number) => (
                      <div
                        key={index}
                        className="p-3 border-b border-gray-200 last:border-b-0"
                      >
                        <div className="text-sm text-red-600">Row {error.row}: {error.error}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {JSON.stringify(error.data)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={onComplete}>Done</Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
