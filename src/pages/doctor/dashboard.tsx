import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Stethoscope,
  Users,
  FileText,
  TrendingUp,
  Calendar as CalendarIcon,
  Mic,
  Search,
  Clock,
  User,
  CalendarDays,
} from "lucide-react";
import { format } from "date-fns";

export default function DoctorDashboard() {
  const { user } = useUser();
  const userData = useQuery(
    api.users.getUserByToken,
    user?.id ? { tokenIdentifier: user.id } : "skip"
  );

  // Fetch consultations for the doctor
  const consultations = useQuery(
    api.consultations.listForDoctor,
    userData?._id ? { doctorId: userData._id } : "skip"
  );

  // Fetch all patients for scheduling dropdown
  const allPatients = useQuery(api.users.getAllPatients);

  // Fetch upcoming appointments for this doctor
  const upcomingAppointments = useQuery(
    api.meetings.getUpcomingMeetingsForDoctor,
    userData?._id ? { doctorId: userData._id } : "skip"
  );

  // Fetch trial matches for this doctor's patients
  const trialMatches = useQuery(
    api.notifications.getPatientNotifications,
    userData?._id ? { patientId: userData._id } : "skip"
  );

  // State for scheduling dialog
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState<Date>();
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingType, setMeetingType] = useState("consultation");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDescription, setMeetingDescription] = useState("");
  const [meetingDuration, setMeetingDuration] = useState("30");

  // Mutation for creating meetings
  const createMeeting = useMutation(api.meetings.createMeeting);

  // Calculate stats based on real data
  const activeConsultations =
    consultations?.filter((c) => c.status === "active").length || 0;
  const completedToday =
    consultations?.filter((c) => {
      if (c.status !== "completed" || !c.endTime) return false;
      const today = new Date();
      const endDate = new Date(c.endTime);
      return endDate.toDateString() === today.toDateString();
    }).length || 0;

  // Calculate unique patients from consultations
  const uniquePatientIds = new Set(
    consultations?.map((c) => c.patientId) || []
  );
  const totalPatients = uniquePatientIds.size;

  // Get pending trial matches count from real data
  const pendingTrialMatchesCount =
    trialMatches?.filter((match) => match.notificationStatus === "pending")
      .length || 0;

  const stats = {
    totalPatients,
    activeConsultations,
    completedToday,
    trialMatches: pendingTrialMatchesCount,
  };

  // Get real trial matches data
  const pendingTrialMatches = trialMatches?.slice(0, 5) || [];

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD]">
      <Navbar />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-[#1D1D1F] mb-2">
              Welcome back, Dr. {userData?.name?.split(" ")[0] || "Doctor"}
            </h1>
            <p className="text-lg text-[#86868B]">
              {userData?.specialization && `${userData.specialization} • `}
              Here's your practice overview for today
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#86868B]">
                  Active Consultations
                </CardTitle>
                <Stethoscope className="h-4 w-4 text-[#0066CC]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#1D1D1F]">
                  {stats.activeConsultations}
                </div>
                <p className="text-xs text-[#86868B] mt-1">In progress now</p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#86868B]">
                  Completed Today
                </CardTitle>
                <FileText className="h-4 w-4 text-[#0066CC]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#1D1D1F]">
                  {stats.completedToday}
                </div>
                <p className="text-xs text-[#86868B] mt-1">Great progress!</p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#86868B]">
                  Trial Matches
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-[#0066CC]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#1D1D1F]">
                  {stats.trialMatches}
                </div>
                <p className="text-xs text-[#86868B] mt-1">Pending review</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Link to="/doctor/consultation">
              <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] bg-gradient-to-br from-[#0066CC] to-[#0077ED] text-white">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-white/20">
                      <Mic className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-white">
                        Start Consultation
                      </CardTitle>
                      <CardDescription className="text-white/80">
                        Begin audio recording and transcription
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/doctor/trial-matching">
              <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] bg-white">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-[#0066CC]/10">
                      <Search className="h-6 w-6 text-[#0066CC]" />
                    </div>
                    <div>
                      <CardTitle>Review Trial Matches</CardTitle>
                      <CardDescription>
                        Approve or decline patient trial matches
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>

            <Dialog
              open={isScheduleDialogOpen}
              onOpenChange={setIsScheduleDialogOpen}
            >
              <DialogTrigger asChild>
                <Card className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] bg-white">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-full bg-[#0066CC]/10">
                        <CalendarIcon className="h-6 w-6 text-[#0066CC]" />
                      </div>
                      <div>
                        <CardTitle>Schedule Appointment</CardTitle>
                        <CardDescription>
                          Select a patient to schedule an appointment
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <DialogHeader className="space-y-3">
                  <DialogTitle className="text-2xl font-semibold text-[#1D1D1F] flex items-center gap-2">
                    <CalendarDays className="h-6 w-6 text-[#0066CC]" />
                    Schedule Appointment
                  </DialogTitle>
                  <DialogDescription className="text-[#86868B] text-base">
                    Fill in the details below to schedule an appointment with
                    your patient.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-6">
                  {/* Patient Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-[#1D1D1F] flex items-center gap-2">
                      <User className="h-4 w-4 text-[#0066CC]" />
                      Select Patient
                      <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={selectedPatient}
                      onValueChange={setSelectedPatient}
                    >
                      <SelectTrigger className="h-12 border-2 hover:border-[#0066CC]/50 focus:border-[#0066CC] transition-colors">
                        <SelectValue placeholder="Choose a patient from your list" />
                      </SelectTrigger>
                      <SelectContent>
                        {allPatients?.map((patient) => (
                          <SelectItem key={patient._id} value={patient._id}>
                            <div className="flex flex-col py-1">
                              <span className="font-semibold text-[#1D1D1F]">
                                {patient.name || "Unnamed Patient"}
                              </span>
                              <span className="text-sm text-[#86868B]">
                                {patient.age && `Age: ${patient.age}`}
                                {patient.gender && ` • ${patient.gender}`}
                                {patient.location && ` • ${patient.location}`}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Appointment Title */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-[#1D1D1F]">
                      Appointment Title
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      placeholder="e.g., Follow-up consultation, Annual check-up"
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                      className="h-12 border-2 hover:border-[#0066CC]/50 focus:border-[#0066CC] transition-colors"
                    />
                  </div>

                  {/* Date and Time Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Date Picker */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-[#1D1D1F] flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-[#0066CC]" />
                        Date
                        <span className="text-red-500">*</span>
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`h-12 w-full justify-start text-left font-normal border-2 hover:border-[#0066CC]/50 transition-colors ${
                              !meetingDate && "text-muted-foreground"
                            }`}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {meetingDate
                              ? format(meetingDate, "PPP")
                              : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={meetingDate}
                            onSelect={setMeetingDate}
                            disabled={(date) =>
                              date < new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Time Picker */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-[#1D1D1F] flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[#0066CC]" />
                        Time
                        <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={meetingTime}
                        onValueChange={setMeetingTime}
                      >
                        <SelectTrigger className="h-12 border-2 hover:border-[#0066CC]/50 focus:border-[#0066CC] transition-colors">
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, hour) =>
                            Array.from({ length: 2 }, (_, halfHour) => {
                              const time = `${hour.toString().padStart(2, "0")}:${
                                halfHour === 0 ? "00" : "30"
                              }`;
                              return (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              );
                            })
                          ).flat()}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Duration and Type Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-[#1D1D1F]">
                        Duration
                      </Label>
                      <Select
                        value={meetingDuration}
                        onValueChange={setMeetingDuration}
                      >
                        <SelectTrigger className="h-12 border-2 hover:border-[#0066CC]/50 focus:border-[#0066CC] transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="90">1.5 hours</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-[#1D1D1F]">
                        Appointment Type
                      </Label>
                      <Select
                        value={meetingType}
                        onValueChange={setMeetingType}
                      >
                        <SelectTrigger className="h-12 border-2 hover:border-[#0066CC]/50 focus:border-[#0066CC] transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="consultation">
                            Consultation
                          </SelectItem>
                          <SelectItem value="follow-up">Follow-up</SelectItem>
                          <SelectItem value="check-up">Check-up</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-[#1D1D1F]">
                      Additional Notes
                      <span className="text-[#86868B] font-normal ml-1">
                        (Optional)
                      </span>
                    </Label>
                    <Textarea
                      placeholder="Add any additional notes, special instructions, or preparation requirements for this appointment..."
                      value={meetingDescription}
                      onChange={(e) => setMeetingDescription(e.target.value)}
                      className="min-h-[100px] resize-none border-2 hover:border-[#0066CC]/50 focus:border-[#0066CC] transition-colors"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsScheduleDialogOpen(false);
                        // Reset form
                        setSelectedPatient("");
                        setMeetingTitle("");
                        setMeetingDate(undefined);
                        setMeetingTime("");
                        setMeetingDescription("");
                        setMeetingDuration("30");
                        setMeetingType("consultation");
                      }}
                      className="h-12 px-8 border-2 hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        if (
                          selectedPatient &&
                          meetingDate &&
                          meetingTime &&
                          meetingTitle
                        ) {
                          try {
                            // Create the meeting
                            const [hours, minutes] = meetingTime.split(":");
                            const appointmentDateTime = new Date(meetingDate);
                            appointmentDateTime.setHours(
                              parseInt(hours),
                              parseInt(minutes)
                            );

                            await createMeeting({
                              patientId: selectedPatient as Id<"users">,
                              doctorId: userData?._id as Id<"users">,
                              title: meetingTitle,
                              description: meetingDescription,
                              scheduledDate: appointmentDateTime.getTime(),
                              duration: parseInt(meetingDuration),
                              type: meetingType as
                                | "consultation"
                                | "follow-up"
                                | "check-up"
                                | "emergency",
                            });

                            // Close dialog and reset form
                            setIsScheduleDialogOpen(false);
                            setSelectedPatient("");
                            setMeetingTitle("");
                            setMeetingDate(undefined);
                            setMeetingTime("");
                            setMeetingDescription("");
                            setMeetingDuration("30");
                            setMeetingType("consultation");

                            // Show success message (you could add a toast here)
                            console.log("Appointment scheduled successfully!");
                          } catch (error) {
                            console.error(
                              "Failed to schedule appointment:",
                              error
                            );
                          }
                        }
                      }}
                      disabled={
                        !selectedPatient ||
                        !meetingDate ||
                        !meetingTime ||
                        !meetingTitle
                      }
                      className="h-12 px-8 bg-[#0066CC] hover:bg-[#0077ED] text-white font-semibold"
                    >
                      Schedule Appointment
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upcoming Appointments */}
            <Card className="bg-white h-full">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CalendarDays className="h-5 w-5 text-[#0066CC]" />
                  <span>Upcoming Appointments</span>
                </CardTitle>
                <CardDescription>
                  Your scheduled appointments with patients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {upcomingAppointments && upcomingAppointments.length > 0 ? (
                    upcomingAppointments.slice(0, 5).map((appointment) => {
                      // Find patient details
                      const patient = allPatients?.find(
                        (p) => p._id === appointment.patientId
                      );

                      return (
                        <Link
                          key={appointment._id}
                          to={`/doctor/consultation?patientId=${appointment.patientId}&meetingId=${appointment._id}`}
                          className="block"
                        >
                          <div className="flex items-center justify-between p-3 rounded-lg bg-[#F5F5F7] hover:bg-blue-50 transition-colors cursor-pointer border-l-4 border-transparent hover:border-[#0066CC]">
                            <div className="flex-1">
                              <div className="font-medium text-[#1D1D1F]">
                                {appointment.title || "Medical Appointment"}
                              </div>
                              <div className="text-sm text-[#86868B]">
                                {patient?.name ||
                                  `Patient ID: ${appointment.patientId.toString().substring(0, 8)}`}
                              </div>
                              <div className="text-sm text-[#86868B]">
                                {new Date(
                                  appointment.scheduledDate
                                ).toLocaleString()}
                              </div>
                              {appointment.description && (
                                <div className="text-xs text-[#86868B] mt-1 truncate">
                                  {appointment.description}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end space-y-1">
                              <Badge
                                variant="outline"
                                className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                              >
                                {appointment.type || "consultation"}
                              </Badge>
                              <div className="text-xs text-[#86868B]">
                                {appointment.duration || 30} min
                              </div>
                              <div className="text-xs text-[#0066CC] font-medium">
                                Click to start →
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      No upcoming appointments scheduled.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pending Trial Matches */}
            <Link to="/doctor/trial-matching?filter=pending">
              <Card className="bg-white h-full cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-[#0066CC]" />
                    <span>Pending Trial Matches</span>
                  </CardTitle>
                  <CardDescription>
                    Patients matched with clinical trials awaiting your review
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    {pendingTrialMatchesCount > 0 ? (
                      <div>
                        <div className="text-2xl font-bold text-[#0066CC] mb-2">
                          {pendingTrialMatchesCount}
                        </div>
                        <p className="text-sm text-[#86868B]">
                          {pendingTrialMatchesCount === 1 ? "match" : "matches"}{" "}
                          pending review
                        </p>
                      </div>
                    ) : (
                      <div className="text-gray-500">
                        No pending trial matches found.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
