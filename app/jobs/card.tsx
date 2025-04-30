import React from "react";

export function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-gray-800 rounded-lg shadow-md p-4">{children}</div>;
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 border-b border-gray-700 pb-2">{children}</div>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold text-white">{children}</h2>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function TestComponent() {
  return (
    <div className="w-2/3 pl-4">
      <Card>
        <CardContent>
          <p>Test Content</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function JobCard({
  jobTitle,
  companyName,
  jobType,
  location,
  employmentType,
  category,
  requiredSkills,
}: {
  jobTitle: string;
  companyName: string;
  jobType: string;
  location: string;
  employmentType: string;
  category: string;
  requiredSkills: string;
}) {
  return (
    <div className="bg-gray-800 rounded-lg shadow-md p-4">
      <h2 className="text-lg font-bold text-white">{jobTitle}</h2>
      <p className="text-gray-400">{companyName} - {jobType}</p>
      <p className="text-gray-400">{location}</p>
      <p className="text-gray-400">{employmentType} - {category}</p>
      <p className="text-gray-400">Skills: {requiredSkills}</p>
    </div>
  );
}