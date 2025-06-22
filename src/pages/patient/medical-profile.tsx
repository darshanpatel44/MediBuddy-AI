import React from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import MedicalProfileForm from "@/components/medical/MedicalProfileForm";
import { useNavigate } from "react-router-dom";

export default function MedicalProfilePage() {
  const navigate = useNavigate();

  const handleSave = () => {
    // Navigate back to dashboard after successful save
    navigate("/patient/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD]">
      <Navbar />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          <MedicalProfileForm onSave={handleSave} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
