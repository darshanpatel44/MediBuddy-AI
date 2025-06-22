import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  FileText,
  Activity,
  Stethoscope,
  Download,
} from "lucide-react";
import MedicalReportDisplay from "@/components/medical/MedicalReportDisplay";
import MedicalEntityExtraction from "@/components/medical/MedicalEntityExtraction";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Badge } from "@/components/ui/badge";

export default function PatientConsultation() {
  const { consultationId } = useParams<{ consultationId: string }>();
  const navigate = useNavigate();
  const { user } = useUser();

  // Fetch current user data
  const userData = useQuery(
    api.users.getUserByToken,
    user?.id ? { tokenIdentifier: user.id } : "skip"
  );

  // Fetch consultation data
  const consultation = useQuery(
    api.consultations.get,
    consultationId ? { id: consultationId as Id<"consultations"> } : "skip"
  );

  // Fetch doctor data
  const doctor = useQuery(
    api.users.getById,
    consultation?.doctorId ? { id: consultation.doctorId } : "skip"
  );

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Handle download report
  const handleDownloadReport = () => {
    if (!consultation?.medicalReport) return;

    const blob = new Blob([consultation.medicalReport], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medical-report-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Check if user has access to this consultation
  if (consultation && userData && consultation.patientId !== userData._id) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FBFBFD]">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <h1 className="text-2xl font-semibold text-[#1D1D1F] mb-4">
              Access Denied
            </h1>
            <p className="text-gray-600 mb-6">
              You don't have permission to view this consultation.
            </p>
            <Button onClick={() => navigate("/patient/dashboard")}>
              Return to Dashboard
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Check if consultation has been shared
  if (consultation && !consultation.sharedWithPatient) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FBFBFD]">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <h1 className="text-2xl font-semibold text-[#1D1D1F] mb-4">
              Report Not Available
            </h1>
            <p className="text-gray-600 mb-6">
              This consultation report has not been shared with you yet. Please
              contact your doctor.
            </p>
            <Button onClick={() => navigate("/patient/dashboard")}>
              Return to Dashboard
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD]">
      <Navbar />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/patient/dashboard")}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
            {consultation?.medicalReport && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadReport}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-semibold text-[#1D1D1F] mb-4">
            Medical Consultation Report
          </h1>

          {/* Consultation Info */}
          <div className="mb-6 text-gray-600">
            <span className="font-medium">Doctor:</span>{" "}
            {doctor?.name || "Loading..."}
            {consultation?.startTime && (
              <>
                <span className="mx-4">•</span>
                <span className="font-medium">Date:</span>{" "}
                {formatDate(consultation.startTime)}
              </>
            )}
            <span className="mx-4">•</span>
            <span className="font-medium">Status:</span>{" "}
            <span
              className={`capitalize ${
                consultation?.status === "completed"
                  ? "text-green-600"
                  : consultation?.status === "active"
                    ? "text-blue-600"
                    : "text-gray-600"
              }`}
            >
              {consultation?.status || "Loading..."}
            </span>
            {consultation?.sharedAt && (
              <>
                <span className="mx-4">•</span>
                <span className="font-medium">Shared:</span>{" "}
                {formatDate(consultation.sharedAt)}
              </>
            )}
          </div>

          {/* Status Badge */}
          <div className="mb-6">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Shared by Doctor
            </Badge>
          </div>

          {!consultation ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner className="h-8 w-8" />
            </div>
          ) : (
            <>
              {/* Tabs */}
              <Tabs defaultValue="medical-report" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value="medical-report">
                    Medical Report
                  </TabsTrigger>
                  <TabsTrigger value="medical-entities">
                    Medical Details
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="medical-report" className="space-y-6">
                  {/* Medical Report Section */}
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-[#0066CC]" />
                        <span>Medical Report</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {consultationId && (
                        <MedicalReportDisplay
                          consultationId={consultationId as Id<"consultations">}
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="medical-entities" className="space-y-6">
                  {/* Medical Entities Section */}
                  <Card className="bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Stethoscope className="h-5 w-5 text-[#0066CC]" />
                        <span>Medical Details</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {consultationId && (
                        <MedicalEntityExtraction
                          consultationId={consultationId as Id<"consultations">}
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
