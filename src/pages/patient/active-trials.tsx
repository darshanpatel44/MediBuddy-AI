import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
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
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Calendar,
  MapPin,
  Users,
  Clock,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  FileText,
  Phone,
} from "lucide-react";

export default function ActiveTrialsPage() {
  const { user } = useUser();
  const userData = useQuery(
    api.users.getUserByToken,
    user?.id ? { tokenIdentifier: user.id } : "skip"
  );

  const patientId = userData?._id;

  // Fetch notifications to get active trials
  const notifications = useQuery(
    api.notifications.getPatientNotifications,
    patientId ? { patientId } : "skip"
  );

  // Filter for active trials (approved/enrolled)
  const activeTrials =
    notifications
      ?.filter(
        (notification) =>
          notification.consentStatus === "approved" ||
          notification.consentStatus === "enrolled"
      )
      .map((trial) => ({
        id: trial.id,
        title: trial.trialTitle,
        sponsor: trial.trialSponsor,
        phase: trial.trialPhase,
        status: trial.consentStatus,
        matchDate: trial.matchDate,
        relevanceScore: trial.relevanceScore,
        // Mock additional data
        progress: trial.consentStatus === "enrolled" ? 65 : 25,
        nextAppointment: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        totalParticipants: Math.floor(Math.random() * 500) + 100,
        studyDuration: "12 months",
        location: "Stanford Medical Center",
        coordinator: {
          name: "Dr. Sarah Johnson",
          phone: "(650) 555-0123",
          email: "s.johnson@stanford.edu",
        },
        recentUpdates: [
          {
            date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            title: "Lab Results Received",
            description:
              "Your recent blood work has been processed and reviewed.",
          },
          {
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            title: "Medication Reminder",
            description: "Continue taking study medication as prescribed.",
          },
        ],
        upcomingTasks: [
          "Complete weekly health survey",
          "Schedule follow-up appointment",
          "Review medication compliance log",
        ],
      })) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "enrolled":
        return (
          <Badge className="bg-green-100 text-green-800">
            Actively Enrolled
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            Approved - Pending Enrollment
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800">Unknown Status</Badge>
        );
    }
  };

  const getPhaseBadge = (phase: string) => {
    const colors = {
      I: "bg-yellow-100 text-yellow-800",
      II: "bg-blue-100 text-blue-800",
      III: "bg-purple-100 text-purple-800",
      IV: "bg-green-100 text-green-800",
    };
    return (
      <Badge className={colors[phase] || "bg-gray-100 text-gray-800"}>
        Phase {phase}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD]">
      <Navbar />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <Link to="/patient/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-semibold text-[#1D1D1F] mb-2">
              Active Clinical Trials
            </h1>
            <p className="text-lg text-[#86868B]">
              Track your participation in clinical trials and upcoming
              activities
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#86868B]">
                  Active Trials
                </CardTitle>
                <Activity className="h-4 w-4 text-[#0066CC]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#1D1D1F]">
                  {activeTrials.length}
                </div>
                <p className="text-xs text-[#86868B] mt-1">
                  Currently participating
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#86868B]">
                  Enrolled
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#1D1D1F]">
                  {
                    activeTrials.filter((trial) => trial.status === "enrolled")
                      .length
                  }
                </div>
                <p className="text-xs text-[#86868B] mt-1">Fully enrolled</p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#86868B]">
                  Pending Tasks
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#1D1D1F]">
                  {activeTrials.reduce(
                    (total, trial) => total + trial.upcomingTasks.length,
                    0
                  )}
                </div>
                <p className="text-xs text-[#86868B] mt-1">Tasks to complete</p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#86868B]">
                  Next Appointment
                </CardTitle>
                <Calendar className="h-4 w-4 text-[#0066CC]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#1D1D1F]">
                  {activeTrials.length > 0 ? "7" : "0"}
                </div>
                <p className="text-xs text-[#86868B] mt-1">Days away</p>
              </CardContent>
            </Card>
          </div>

          {/* Active Trials List */}
          <div className="space-y-8">
            {activeTrials.length > 0 ? (
              activeTrials.map((trial) => (
                <Card key={trial.id} className="bg-white">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <CardTitle className="text-xl">
                            {trial.title}
                          </CardTitle>
                          {getStatusBadge(trial.status)}
                          {getPhaseBadge(trial.phase)}
                        </div>
                        <CardDescription className="text-base">
                          Sponsored by {trial.sponsor}
                        </CardDescription>
                        <div className="flex items-center mt-2 space-x-4 text-sm text-[#86868B]">
                          <span>Match: {trial.relevanceScore}%</span>
                          <span>
                            Started:{" "}
                            {new Date(trial.matchDate).toLocaleDateString()}
                          </span>
                          <span>Duration: {trial.studyDuration}</span>
                        </div>
                      </div>
                      <Activity className="h-6 w-6 text-[#0066CC]" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Trial Progress */}
                      <div className="lg:col-span-2">
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-[#1D1D1F]">
                              Trial Progress
                            </h4>
                            <span className="text-sm text-[#86868B]">
                              {trial.progress}% Complete
                            </span>
                          </div>
                          <Progress value={trial.progress} className="h-2" />
                        </div>

                        {/* Recent Updates */}
                        <div className="mb-6">
                          <h4 className="font-medium text-[#1D1D1F] mb-3">
                            Recent Updates
                          </h4>
                          <div className="space-y-3">
                            {trial.recentUpdates.map((update, index) => (
                              <div
                                key={index}
                                className="flex items-start space-x-3 p-3 rounded-lg bg-[#F5F5F7]"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-sm text-[#1D1D1F]">
                                      {update.title}
                                    </p>
                                    <span className="text-xs text-[#86868B]">
                                      {update.date.toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-[#86868B] mt-1">
                                    {update.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Upcoming Tasks */}
                        <div>
                          <h4 className="font-medium text-[#1D1D1F] mb-3">
                            Upcoming Tasks
                          </h4>
                          <div className="space-y-2">
                            {trial.upcomingTasks.map((task, index) => (
                              <div
                                key={index}
                                className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200"
                              >
                                <Clock className="h-4 w-4 text-orange-600" />
                                <span className="text-sm text-[#1D1D1F]">
                                  {task}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-auto"
                                >
                                  Mark Complete
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Trial Information */}
                      <div className="space-y-6">
                        {/* Next Appointment */}
                        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            <h5 className="font-medium text-blue-900">
                              Next Appointment
                            </h5>
                          </div>
                          <p className="text-sm text-blue-800 mb-1">
                            {trial.nextAppointment.toLocaleDateString()}
                          </p>
                          <p className="text-sm text-blue-800">
                            {trial.nextAppointment.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>

                        {/* Location */}
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <MapPin className="h-4 w-4 text-[#0066CC]" />
                            <h5 className="font-medium text-[#1D1D1F]">
                              Study Location
                            </h5>
                          </div>
                          <p className="text-sm text-[#86868B]">
                            {trial.location}
                          </p>
                        </div>

                        {/* Study Info */}
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <Users className="h-4 w-4 text-[#0066CC]" />
                            <h5 className="font-medium text-[#1D1D1F]">
                              Study Information
                            </h5>
                          </div>
                          <p className="text-sm text-[#86868B] mb-1">
                            {trial.totalParticipants} total participants
                          </p>
                          <p className="text-sm text-[#86868B]">
                            Duration: {trial.studyDuration}
                          </p>
                        </div>

                        {/* Coordinator */}
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <Phone className="h-4 w-4 text-[#0066CC]" />
                            <h5 className="font-medium text-[#1D1D1F]">
                              Study Coordinator
                            </h5>
                          </div>
                          <p className="text-sm text-[#1D1D1F] mb-1">
                            {trial.coordinator.name}
                          </p>
                          <p className="text-sm text-[#86868B] mb-1">
                            {trial.coordinator.phone}
                          </p>
                          <p className="text-sm text-[#86868B]">
                            {trial.coordinator.email}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2">
                          <Button className="w-full bg-[#0066CC] hover:bg-[#0052A3]">
                            <FileText className="h-4 w-4 mr-2" />
                            View Study Details
                          </Button>
                          <Button variant="outline" className="w-full">
                            <Phone className="h-4 w-4 mr-2" />
                            Contact Coordinator
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-white">
                <CardContent className="text-center py-12">
                  <Activity className="h-12 w-12 text-[#86868B] mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-[#1D1D1F] mb-2">
                    No Active Trials
                  </h3>
                  <p className="text-[#86868B] mb-4">
                    You're not currently participating in any clinical trials.
                  </p>
                  <Link to="/patient/notifications">
                    <Button className="bg-[#0066CC] hover:bg-[#0052A3]">
                      Browse Available Trials
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
