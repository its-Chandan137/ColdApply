import React from "react";

export type FlowNode = {
  id: string;
  label: string;
  value?: string | number | null;
  sub?: string | null;
  status?: "idle" | "active" | "success" | "warn" | "error";
  children?: FlowNode[];
};

function statusStyles(status: FlowNode["status"]) {
  switch (status) {
    case "active":
      return "border-[#00BFA5] bg-[#E8F9F5] text-[#075B4E]";
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "warn":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "error":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-[#E5EAF0] bg-white text-[#111827]";
  }
}

function NodeCard({ node }: { node: FlowNode }) {
  return (
    <div
      className={`relative rounded-xl border px-4 py-3 shadow-xs ${statusStyles(node.status)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">
            {node.label}
          </p>
          {node.value !== undefined && node.value !== null && (
            <p className="mt-0.5 text-lg font-bold leading-tight">{node.value}</p>
          )}
          {node.sub && (
            <p className="mt-0.5 text-xs font-medium opacity-80">{node.sub}</p>
          )}
        </div>
        {node.status === "active" && (
          <span className="mt-1 h-2 w-2 animate-pulse rounded-full bg-[#00BFA5]" />
        )}
      </div>
    </div>
  );
}

function TreeBranch({ node, isLast }: { node: FlowNode; isLast: boolean }) {
  const hasChildren = node.children && node.children.length > 0;
  return (
    <div className="relative pl-6">
      {/* vertical connector */}
      <div
        className="absolute left-2 top-0 w-px bg-[#E5EAF0]"
        style={{ bottom: isLast ? "auto" : 0, height: isLast ? "1.25rem" : "100%" }}
      />
      {/* horizontal connector */}
      <div className="absolute left-2 top-5 h-px w-4 bg-[#E5EAF0]" />
      <div className="pb-3">
        <NodeCard node={node} />
        {hasChildren && (
          <div className="mt-2">
            {node.children!.map((child, i) => (
              <TreeBranch
                key={child.id}
                node={child}
                isLast={i === node.children!.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FlowTree({
  title,
  nodes,
}: {
  title?: string;
  nodes: FlowNode[];
}) {
  return (
    <div className="rounded-[22px] border border-[#E5EAF0] bg-white p-5 shadow-xs">
      {title && (
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#00BFA5]" />
          <h3 className="text-sm font-bold text-[#111827]">{title}</h3>
        </div>
      )}
      {nodes.length === 0 ? (
        <p className="text-sm text-[#8293AD]">No flow data yet.</p>
      ) : (
        <div className="space-y-1">
          {nodes.map((node, i) => (
            <div key={node.id} className="relative">
              {i === 0 ? (
                <div>
                  <NodeCard node={node} />
                  {node.children && node.children.length > 0 && (
                    <div className="mt-2">
                      {node.children.map((child, ci) => (
                        <TreeBranch
                          key={child.id}
                          node={child}
                          isLast={ci === node.children!.length - 1}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <TreeBranch node={node} isLast={i === nodes.length - 1} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
