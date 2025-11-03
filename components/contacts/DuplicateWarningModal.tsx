"use client";

import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface DuplicateWarningModalProps {
  duplicates: Array<{
    contactId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
    similarity: number;
    matchReason: string[];
  }>;
  onClose: () => void;
  onProceed: () => void;
  onMerge: (primaryId: string) => void;
}

export function DuplicateWarningModal({
  duplicates,
  onClose,
  onProceed,
  onMerge,
}: DuplicateWarningModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Potential Duplicates Found
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                We found {duplicates.length} similar contact{duplicates.length > 1 ? "s" : ""} in your database
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-4 mb-6">
            {duplicates.map((duplicate) => (
              <Card key={duplicate.contactId} className="p-4 border-2 border-yellow-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {duplicate.firstName && duplicate.lastName
                          ? `${duplicate.firstName} ${duplicate.lastName}`
                          : duplicate.email || duplicate.phone || "Unknown"}
                      </h3>
                      <Badge variant="warning">
                        {Math.round(duplicate.similarity * 100)}% match
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                      {duplicate.email && (
                        <div>
                          <span className="font-medium">Email:</span> {duplicate.email}
                        </div>
                      )}
                      {duplicate.phone && (
                        <div>
                          <span className="font-medium">Phone:</span> {duplicate.phone}
                        </div>
                      )}
                      {duplicate.company && (
                        <div>
                          <span className="font-medium">Company:</span> {duplicate.company}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {duplicate.matchReason.map((reason, index) => (
                        <span
                          key={index}
                          className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onMerge(duplicate.contactId)}
                    className="ml-4"
                  >
                    Merge with this
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">
              What would you like to do?
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Create Anyway:</strong> Save this as a new contact (may create duplicates)</li>
              <li>• <strong>Merge:</strong> Combine with an existing contact (keeps all messages and notes)</li>
              <li>• <strong>Cancel:</strong> Go back and edit the contact details</li>
            </ul>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onProceed}>
              Create Anyway
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
