"use client";

import { AdminQuestionForm } from "@/components/admin-question-form";

export default function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  return <AdminQuestionForm params={params} />;
}
