"use client";

import { useRouter } from "next/navigation";
import { ProjectForm } from "@/components/app/project-form";
import { PageContainer, PageHeader } from "@/components/app/page-header";

export default function NewProjectPage() {
  const router = useRouter();

  return (
    <PageContainer>
      <PageHeader
        title="新しい案件"
        description="案件を作成すると、売上・材料費・外注費・書類をまとめて管理できます"
        backHref="/app/projects"
        backLabel="案件一覧"
      />
      <ProjectForm
        open
        onClose={() => router.push("/app/projects")}
        onSaved={(project) => router.push(`/app/projects/${project.id}`)}
      />
    </PageContainer>
  );
}
