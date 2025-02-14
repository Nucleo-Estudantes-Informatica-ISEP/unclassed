"use client";

import { useEffect, useState } from "react";

import MultipleSelector from "@/lib/components/ui/multiple-selector";

const MultipleClassSelect = () => {
  const [options, setOptions] = useState([]);

  useEffect(() => {
    async function fetchClasses() {
      const res = await fetch("/api/classes").then((res) => res.json());
      setOptions(res);
    }

    fetchClasses();
  }, []);

  return (
    <div className="w-full">
      <MultipleSelector
        defaultOptions={options}
        placeholder="Seleciona as turmas..."
        emptyIndicator={
          <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
            no results found.
          </p>
        }
      />
    </div>
  );
};

export default MultipleClassSelect;
