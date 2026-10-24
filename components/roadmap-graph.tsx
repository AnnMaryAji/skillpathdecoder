"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { Skill, SkillStatusEntry } from "@/lib/roadmap";

const statusColors: Record<string, string> = {
  mastered: "#16a34a",
  in_progress: "#f59e0b",
  unlocked: "#2563eb",
  blocked: "#6b7280",
  not_started: "#9ca3af",
};

export function RoadmapGraph({
  skills,
  statuses,
}: {
  skills: Skill[];
  statuses: Record<string, SkillStatusEntry>;
}) {
  const nodes: Node[] = skills.map((skill, index) => ({
    id: skill.skill_id,
    type: "default",
    position: {
      x: (index % 3) * 260,
      y: Math.floor(index / 3) * 150,
    },
    data: {
      label: `${skill.skill_name} (${skill.estimated_hours}h)`,
      status: statuses[skill.skill_id]?.status ?? "not_started",
    },
    style: {
      background: statusColors[statuses[skill.skill_id]?.status ?? "not_started"],
      color: "white",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: 12,
      width: 180,
    },
  }));

  const edges: Edge[] = skills.flatMap((skill) =>
    skill.prerequisites.map((prerequisiteId) => ({
      id: `${prerequisiteId}-${skill.skill_id}`,
      source: prerequisiteId,
      target: skill.skill_id,
      animated: true,
      label: "depends on",
    })),
  );

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
        <Background color="#cbd5e1" gap={16} />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </div>
  );
}
