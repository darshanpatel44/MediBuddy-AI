import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, Share, ArrowLeft, CheckCircle } from "lucide-react";
import AudioRecorder from "@/components/audio/AudioRecorder";
import MedicalReportDisplay from "@/components/medical/MedicalReportDisplay";
import MedicalEntityExtraction from "@/components/medical/MedicalEntityExtraction";
import { ASI1TrialMatching } from "@/components/medical/ASI1TrialMatching";
import { LoadingSpinner } from "@/components/loading-spinner";

export default function DoctorConsultation() {
  const { consultationId } = useParams<{ consultationId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useUser();

  // Get query parameters from URL
  const urlPatientId = searchParams.get("patientId");
  const urlMeetingId = searchParams.get("meetingId");
  const [audioRecordingId, setAudioRecordingId] =
    useState<Id<"audioRecordings"> | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Create or get existing consultation
  const createOrGetConsultation = useMutation(
    api.consultations.createOrGetConsultation
  );

  // Share consultation mutation
  const shareConsultation = useMutation(api.consultations.shareWithPatient);
  const [isSharing, setIsSharing] = useState(false);

  // Fetch the current user's Convex document
  const currentUser = useQuery(
    api.users.getUserByToken,
    user ? { tokenIdentifier: user.id } : "skip"
  );

  // Fetch consultation data
  const consultation = useQuery(
    api.consultations.get,
    consultationId ? { id: consultationId as Id<"consultations"> } : "skip"
  );

  // Fetch patient data
  const patient = useQuery(
    api.users.getById,
    consultation?.patientId ? { id: consultation.patientId } : "skip"
  );

  // Fetch meeting data if meetingId is provided
  const meeting = useQuery(
    api.meetings.getMeetingById,
    urlMeetingId ? { id: urlMeetingId as Id<"meetings"> } : "skip"
  );

  // Initialize consultation if needed
  useEffect(() => {
    const initializeConsultation = async () => {
      if (!consultationId && user && currentUser) {
        try {
          // Use the current user's Convex document ID as the doctor
          const doctorId = currentUser._id;

          // For patient ID, we need to handle different cases:
          let targetPatientId: Id<"users">;

          if (urlPatientId) {
            // If patient ID is provided in URL, use it directly (assuming it's already a Convex ID)
            targetPatientId = urlPatientId as Id<"users">;
          } else {
            // Otherwise, use the current user as both doctor and patient (for testing)
            targetPatientId = currentUser._id;
          }

          const newConsultationId = await createOrGetConsultation({
            doctorId,
            patientId: targetPatientId,
            meetingId: urlMeetingId
              ? (urlMeetingId as Id<"meetings">)
              : undefined,
          });

          // Navigate to the new consultation
          navigate(
            `/doctor/consultation/${newConsultationId}?patientId=${targetPatientId}&meetingId=${urlMeetingId || ""}`
          );
        } catch (error) {
          console.error("Error creating consultation:", error);
          toast({
            title: "Error",
            description: "Failed to create consultation",
            variant: "destructive",
          });
        }
      }
    };

    initializeConsultation();
  }, [
    consultationId,
    user,
    currentUser,
    createOrGetConsultation,
    navigate,
    urlPatientId,
    urlMeetingId,
  ]);

  // Set audio recording ID from consultation data
  useEffect(() => {
    if (consultation?.audioRecordingId) {
      setAudioRecordingId(consultation.audioRecordingId);
    }
  }, [consultation]);

  // Handle recording complete
  const handleRecordingComplete = (
    newAudioRecordingId: Id<"audioRecordings">
  ) => {
    setAudioRecordingId(newAudioRecordingId);
    setIsRecording(false);
    toast({
      title: "Recording Complete",
      description: "Audio recording has been saved successfully",
      variant: "default",
    });
  };

  // Handle recording start
  const handleRecordingStart = () => {
    setIsRecording(true);
  };

  // Handle recording stop
  const handleRecordingStop = () => {
    setIsRecording(false);
  };

  // Handle share with patient
  const handleShareWithPatient = async () => {
    if (!consultation || !currentUser) {
      toast({
        title: "Error",
        description: "Consultation or user data not available",
        variant: "destructive",
      });
      return;
    }

    if (!consultation.medicalReport) {
      toast({
        title: "Medical Report Required",
        description:
          "Please generate a medical report before sharing with the patient",
        variant: "destructive",
      });
      return;
    }

    setIsSharing(true);
    try {
      await shareConsultation({
        id: consultation._id,
        doctorId: currentUser._id,
      });

      toast({
        title: "Report Shared Successfully",
        description: "The medical report has been shared with the patient",
        variant: "default",
      });
    } catch (error) {
      console.error("Error sharing consultation:", error);
      toast({
        title: "Sharing Failed",
        description:
          "Failed to share the report with the patient. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  // Remove blocking loading state - let the page render with fallback data

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get appointment info - prioritize meeting data, fallback to consultation, then sample data
  const appointmentDate =
    meeting?.scheduledDate || consultation?.startTime || Date.now();
  const appointmentStatus =
    meeting?.status ||
    (consultation?.status === "completed" ? "completed" : "scheduled");
  const patientName = patient?.name || "Darshan Arunbhai Patel"; // Fallback to sample name

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
                onClick={() => navigate("/doctor/dashboard")}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className={
                consultation?.sharedWithPatient
                  ? "text-green-600 border-green-600 hover:bg-green-50"
                  : "text-blue-600 border-blue-600 hover:bg-blue-50"
              }
              onClick={handleShareWithPatient}
              disabled={isSharing || !consultation?.medicalReport}
            >
              {isSharing ? (
                <LoadingSpinner className="h-4 w-4 mr-2" />
              ) : consultation?.sharedWithPatient ? (
                <CheckCircle className="h-4 w-4 mr-2" />
              ) : (
                <Share className="h-4 w-4 mr-2" />
              )}
              {consultation?.sharedWithPatient
                ? "Shared with Patient"
                : "Share with Patient"}
            </Button>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-semibold text-[#1D1D1F] mb-4">
            Medical Appointment
          </h1>

          {/* Appointment Info */}
          <div className="mb-6 text-gray-600">
            <span className="font-medium">Patient:</span> {patientName}
            {appointmentDate && (
              <>
                <span className="mx-4">•</span>
                <span className="font-medium">Date:</span>{" "}
                {formatDate(appointmentDate)}
              </>
            )}
            <span className="mx-4">•</span>
            <span className="font-medium">Status:</span> {appointmentStatus}
          </div>

          {/* Tabs */}
          <Tabs
            defaultValue={searchParams.get("tab") || "recording"}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="recording">Recording</TabsTrigger>
              <TabsTrigger value="entities">Medical Entities</TabsTrigger>
              <TabsTrigger value="medical-report">Medical Report</TabsTrigger>
              <TabsTrigger value="clinical-trials">Clinical Trials</TabsTrigger>
            </TabsList>

            <TabsContent value="recording" className="space-y-6">
              {/* Audio Recording Section */}
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold">
                    Audio Recording
                  </CardTitle>
                  <p className="text-gray-600">
                    Record your appointment conversation for transcription
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="py-6">
                    {consultationId ? (
                      <AudioRecorder
                        consultationId={consultationId as Id<"consultations">}
                        onRecordingComplete={handleRecordingComplete}
                        onRecordingStart={handleRecordingStart}
                        onRecordingStop={handleRecordingStop}
                      />
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <LoadingSpinner />
                        <p className="mt-2">Loading consultation...</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="entities" className="space-y-6">
              {consultationId ? (
                <MedicalEntityExtraction
                  consultationId={consultationId as Id<"consultations">}
                />
              ) : (
                <Card className="bg-white">
                  <CardContent>
                    <div className="text-center py-12 text-gray-500">
                      <LoadingSpinner />
                      <p className="mt-2">Loading consultation...</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="medical-report" className="space-y-6">
              {consultationId ? (
                <MedicalReportDisplay
                  consultationId={consultationId as Id<"consultations">}
                />
              ) : (
                <Card className="bg-white">
                  <CardContent>
                    <div className="text-center py-12 text-gray-500">
                      <LoadingSpinner />
                      <p className="mt-2">Loading consultation...</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="clinical-trials" className="space-y-6">
              {consultationId && patient ? (
                <ASI1TrialMatching
                  consultationId={consultationId as Id<"consultations">}
                  patientId={patient._id}
                />
              ) : (
                <Card className="bg-white">
                  <CardContent>
                    <div className="text-center py-12 text-gray-500">
                      <LoadingSpinner />
                      <p className="mt-2">Loading trial matching...</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
}
