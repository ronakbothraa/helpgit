"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React from "react";
import { useForm } from "react-hook-form";

type FormInput = {
  projectName: string;
  repoUrl: string;
  githubToken?: string;
};

const CreatePage = () => {
  const { register, handleSubmit, reset } = useForm<FormInput>();

  function onSubmit(data: FormInput) {
    window.alert(JSON.stringify(data, null, 2));
    return true;
  }

  return (
    <div className="flex h-full items-center justify-center gap-12">
      <img src="/assets/create_page.png" className="h-56 w-auto" />
      <div>
        <div>
          <h1 className="text-2xl font-semibold">
            Link your GitHub Repository
          </h1>
          <p className="text-muted-foreground text-sm">
            Enter the URL of your repository to link it to helpgit.
          </p>
        </div>
        <div className="h-4"></div>
        <div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Input
              {...(register("projectName", { required: true }))}
              placeholder="Project Name"
              required
            />
            <div className="h-2"></div>
            <Input
              {...(register("repoUrl", { required: true }))}
              placeholder="Repository URL"
              required
            />
            <div className="h-2"></div>
            <Input
              {...(register("githubToken"))}
              placeholder="Github Token (optional)"
            />
            <div className="h-4"></div>
            <Button type="submit">
              Create Project
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePage;
