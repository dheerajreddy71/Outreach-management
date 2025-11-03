"use client";

import { useState } from "react";
import { Button } from "./Button";
import { Card, CardContent } from "./Card";
import { X, Plus, Trash2, Save } from "lucide-react";

export interface FilterCondition {
  id: string;
  field: string;
  operator: "equals" | "contains" | "gt" | "lt" | "between" | "in";
  value: string | string[];
}

export interface FilterGroup {
  id: string;
  logic: "AND" | "OR";
  conditions: FilterCondition[];
}

interface FilterBuilderProps {
  fields: { value: string; label: string; type: "text" | "number" | "date" | "select"; options?: string[] }[];
  onApply: (groups: FilterGroup[]) => void;
  onSave?: (name: string, groups: FilterGroup[]) => void;
  savedFilters?: { name: string; groups: FilterGroup[] }[];
  onLoadFilter?: (groups: FilterGroup[]) => void;
}

export function FilterBuilder({ fields, onApply, onSave, savedFilters, onLoadFilter }: FilterBuilderProps) {
  const [groups, setGroups] = useState<FilterGroup[]>([
    {
      id: Date.now().toString(),
      logic: "AND",
      conditions: [
        {
          id: Date.now().toString(),
          field: fields[0]?.value || "",
          operator: "equals",
          value: "",
        },
      ],
    },
  ]);

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [filterName, setFilterName] = useState("");

  const addGroup = () => {
    setGroups([
      ...groups,
      {
        id: Date.now().toString(),
        logic: "AND",
        conditions: [
          {
            id: Date.now().toString(),
            field: fields[0]?.value || "",
            operator: "equals",
            value: "",
          },
        ],
      },
    ]);
  };

  const removeGroup = (groupId: string) => {
    setGroups(groups.filter((g) => g.id !== groupId));
  };

  const updateGroupLogic = (groupId: string, logic: "AND" | "OR") => {
    setGroups(groups.map((g) => (g.id === groupId ? { ...g, logic } : g)));
  };

  const addCondition = (groupId: string) => {
    setGroups(
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              conditions: [
                ...g.conditions,
                {
                  id: Date.now().toString(),
                  field: fields[0]?.value || "",
                  operator: "equals",
                  value: "",
                },
              ],
            }
          : g
      )
    );
  };

  const removeCondition = (groupId: string, conditionId: string) => {
    setGroups(
      groups.map((g) =>
        g.id === groupId ? { ...g, conditions: g.conditions.filter((c) => c.id !== conditionId) } : g
      )
    );
  };

  const updateCondition = (groupId: string, conditionId: string, updates: Partial<FilterCondition>) => {
    setGroups(
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              conditions: g.conditions.map((c) => (c.id === conditionId ? { ...c, ...updates } : c)),
            }
          : g
      )
    );
  };

  const getOperatorsForField = (fieldValue: string) => {
    const field = fields.find((f) => f.value === fieldValue);
    if (!field) return [];

    switch (field.type) {
      case "text":
        return [
          { value: "equals", label: "Equals" },
          { value: "contains", label: "Contains" },
        ];
      case "number":
      case "date":
        return [
          { value: "equals", label: "Equals" },
          { value: "gt", label: "Greater than" },
          { value: "lt", label: "Less than" },
          { value: "between", label: "Between" },
        ];
      case "select":
        return [
          { value: "equals", label: "Equals" },
          { value: "in", label: "In" },
        ];
      default:
        return [];
    }
  };

  const handleSave = () => {
    if (onSave && filterName.trim()) {
      onSave(filterName, groups);
      setFilterName("");
      setSaveModalOpen(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
          <div className="flex gap-2">
            {onSave && (
              <Button size="sm" variant="outline" onClick={() => setSaveModalOpen(true)}>
                <Save className="w-4 h-4 mr-2" />
                Save Filter
              </Button>
            )}
            <Button size="sm" onClick={() => onApply(groups)}>
              Apply Filters
            </Button>
          </div>
        </div>

        {/* Saved Filters */}
        {savedFilters && savedFilters.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Load Saved Filter</label>
            <div className="flex flex-wrap gap-2">
              {savedFilters.map((saved, idx) => (
                <Button
                  key={idx}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setGroups(saved.groups);
                    onLoadFilter?.(saved.groups);
                  }}
                >
                  {saved.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {groups.map((group, groupIdx) => (
            <div key={group.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Group {groupIdx + 1}</span>
                  <select
                    value={group.logic}
                    onChange={(e) => updateGroupLogic(group.id, e.target.value as "AND" | "OR")}
                    className="text-xs px-2 py-1 border border-gray-300 rounded"
                  >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                </div>
                {groups.length > 1 && (
                  <Button size="sm" variant="outline" onClick={() => removeGroup(group.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {group.conditions.map((condition, condIdx) => {
                  const field = fields.find((f) => f.value === condition.field);
                  const operators = getOperatorsForField(condition.field);

                  return (
                    <div key={condition.id} className="flex items-center gap-2 flex-wrap">
                      {condIdx > 0 && (
                        <span className="text-xs text-gray-500 font-medium">{group.logic}</span>
                      )}
                      <select
                        value={condition.field}
                        onChange={(e) => updateCondition(group.id, condition.id, { field: e.target.value })}
                        className="text-sm px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {fields.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>

                      <select
                        value={condition.operator}
                        onChange={(e) =>
                          updateCondition(group.id, condition.id, {
                            operator: e.target.value as FilterCondition["operator"],
                          })
                        }
                        className="text-sm px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        {operators.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>

                      {field?.type === "select" && field.options ? (
                        <select
                          value={condition.value as string}
                          onChange={(e) => updateCondition(group.id, condition.id, { value: e.target.value })}
                          className="text-sm px-3 py-2 border border-gray-300 rounded-lg flex-1 min-w-[150px]"
                        >
                          <option value="">Select...</option>
                          {field.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field?.type === "number" ? "number" : field?.type === "date" ? "date" : "text"}
                          value={condition.value as string}
                          onChange={(e) => updateCondition(group.id, condition.id, { value: e.target.value })}
                          placeholder="Enter value..."
                          className="text-sm px-3 py-2 border border-gray-300 rounded-lg flex-1 min-w-[150px]"
                        />
                      )}

                      {group.conditions.length > 1 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeCondition(group.id, condition.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              <Button size="sm" variant="outline" onClick={() => addCondition(group.id)} className="mt-3">
                <Plus className="w-4 h-4 mr-2" />
                Add Condition
              </Button>
            </div>
          ))}
        </div>

        <Button variant="outline" onClick={addGroup} className="mt-4">
          <Plus className="w-4 h-4 mr-2" />
          Add Group
        </Button>

        {/* Save Filter Modal */}
        {saveModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Filter</h3>
                <input
                  type="text"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Enter filter name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setSaveModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={!filterName.trim()}>
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
