import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Link } from "react-router-dom";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Calendar,
  User,
  Download,
  ArrowRight,
  Clock,
  Eye,
} from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";

export default function PatientReports() {
  const { user } = useUser();

  // Fetch current user data
  const userData = useQuery(
    api.users.getUserByToken,
    user?.id ? { tokenIdentifier: user.id } : "skip"
  );

  const patientId = userData?._id;

  // Fetch shared consultations
  const sharedConsultations = useQuery(
    api.consultations.listSharedConsultationsForPatient,
    patientId ? { patientId } : "skip"
  );

  // Fetch doctor information for each consultation
  const doctorIds = sharedConsultations?.map((c) => c.doctorId) || [];
  const doctors = useQuery(
    api.users.getUsersByIds,
    doctorIds.length > 0 ? { ids: doctorIds } : "skip"
  );

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get doctor name by ID
  const getDoctorName = (doctorId: string) => {
    const doctor = doctors?.find((d) => d._id === doctorId);
    return doctor?.name || "Unknown Doctor";
  };

  // Handle download report
  const handleDownloadReport = (consultation: any) => {
    if (!consultation.medicalReport) return;

    const blob = new Blob([consultation.medicalReport], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medical-report-${formatDate(consultation.startTime)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD]">
      <Navbar />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-[#1D1D1F] mb-2">
              Medical Reports
            </h1>
            <p className="text-lg text-[#86868B]">
              View and download your shared consultation reports
            </p>
          </div>

          {/* Reports List */}
          <div className="space-y-6">
            {!sharedConsultations ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner className="h-8 w-8" />
              </div>
            ) : sharedConsultations.length === 0 ? (
              <Card className="bg-white">
                <CardContent className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-[#1D1D1F] mb-2">
                    No Shared Reports
                  </h3>
                  <p className="text-[#86868B] mb-4">
                    You don't have any shared consultation reports yet.
                  </p>
                  <p className="text-sm text-[#86868B]">
                    Your doctor will share consultation reports with you after
                    appointments.
                  </p>
                </CardContent>
              </Card>
            ) : (
              sharedConsultations
                .sort(
                  (a, b) =>
                    (b.sharedAt || b.startTime) - (a.sharedAt || a.startTime)
                )
                .map((consultation) => (
                  <Card
                    key={consultation._id}
                    className="bg-white hover:shadow-lg transition-shadow"
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center space-x-2 mb-2">
                            <FileText className="h-5 w-5 text-[#0066CC]" />
                            <span>Medical Consultation Report</span>
                          </CardTitle>
                          <CardDescription className="space-y-1">
                            <div className="flex items-center space-x-4 text-sm">
                              <div className="flex items-center space-x-1">
                                <User className="h-4 w-4 text-gray-500" />
                                <span>
                                  Dr. {getDoctorName(consultation.doctorId)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span>
                                  {formatDate(consultation.startTime)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4 text-gray-500" />
                                <span>
                                  {formatTime(consultation.startTime)}
                                </span>
                              </div>
                            </div>
                            {consultation.sharedAt && (
                              <div className="flex items-center space-x-1 text-sm text-green-600">
                                <Eye className="h-4 w-4" />
                                <span>
                                  Shared on {formatDate(consultation.sharedAt)}
                                </span>
                              </div>
                            )}
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800"
                          >
                            {consultation.status === "completed"
                              ? "Completed"
                              : "In Progress"}
                          </Badge>
                          {consultation.medicalReport && (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200"
                            >
                              Report Available
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-[#86868B]">
                          {consultation.medicalReport
                            ? "Medical report and consultation details are available"
                            : "Consultation completed, report being prepared"}
                        </p>
                        <div className="flex items-center space-x-2">
                          {consultation.medicalReport && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadReport(consultation)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          )}
                          <Link
                            to={`/patient/consultation/${consultation._id}`}
                          >
                            <Button
                              size="sm"
                              className="bg-[#0066CC] hover:bg-[#0077ED]"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Report
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
