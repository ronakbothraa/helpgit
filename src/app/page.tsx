import { Button } from "@/components/ui/button";
import Link from "next/link";
import React from "react";

const app = () => {
  return (
    <div>
      <Button>
        <Link href="/dashboard">click me</Link>
      </Button>
    </div>
  );
};

export default app;
