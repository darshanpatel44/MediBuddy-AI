import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
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
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/loading-spinner";
import { toast } from "@/components/ui/use-toast";
import {
  Search,
  TrendingUp,
  User,
  MapPin,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Bell,
  MessageCircle,
  Filter,
  AlertCircle,
} from "lucide-react";

export default function DoctorTrialMatching() {
  // State for UI
  const [selectedMatchId, setSelectedMatchId] =
    useState<Id<"trialMatches"> | null>(null);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "declined" | "enrolled"
  >("pending");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTrials, setSelectedTrials] = useState<Id<"trialMatches">[]>(
    []
  );

  // Query trial matches by consent status
  const trialMatches = useQuery(
    api.notifications.getTrialsByConsentStatus,
    filter === "all" ? {} : { consentStatus: filter }
  );

  // Mutations for updating trials
  const updateMatchStatus = useMutation(api.trialMatching.updateMatchStatus);
  const sendTrialNotifications = useMutation(
    api.notifications.sendTrialNotifications
  );

  // Get the selected match
  const selectedMatch = trialMatches?.find(
    (match) => match.match._id === selectedMatchId
  );

  // Handlers
  const handleApprove = async (matchId: Id<"trialMatches">) => {
    setIsSubmitting(true);
    try {
      await updateMatchStatus({
        matchId,
        status: "approved",
        doctorNotes,
      });

      toast({
        title: "Trial approved",
        description: "The patient will be notified of your approval.",
      });

      setDoctorNotes("");
    } catch (error) {
      console.error("Failed to approve trial:", error);
      toast({
        title: "Error",
        description: "Failed to approve the trial. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async (matchId: Id<"trialMatches">) => {
    setIsSubmitting(true);
    try {
      await updateMatchStatus({
        matchId,
        status: "declined",
        doctorNotes,
      });

      toast({
        title: "Trial declined",
        description: "The trial match has been declined.",
        variant: "destructive",
      });

      setDoctorNotes("");
    } catch (error) {
      console.error("Failed to decline trial:", error);
      toast({
        title: "Error",
        description: "Failed to decline the trial. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendNotification = async (matchId: Id<"trialMatches">) => {
    setIsSubmitting(true);
    try {
      await sendTrialNotifications({
        matchIds: [matchId],
        doctorNotes,
      });

      toast({
        title: "Notification sent",
        description: "The patient has been notified about this trial match.",
      });

      setDoctorNotes("");
    } catch (error) {
      console.error("Failed to send notification:", error);
      toast({
        title: "Error",
        description: "Failed to send notification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendBulkNotifications = async () => {
    if (selectedTrials.length === 0) {
      toast({
        title: "No trials selected",
        description: "Please select at least one trial to notify patients.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await sendTrialNotifications({
        matchIds: selectedTrials,
        doctorNotes,
      });

      toast({
        title: "Notifications sent",
        description: `Sent notifications for ${selectedTrials.length} trial matches.`,
      });

      setSelectedTrials([]);
      setDoctorNotes("");
    } catch (error) {
      console.error("Failed to send notifications:", error);
      toast({
        title: "Error",
        description: "Failed to send notifications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTrialSelection = (matchId: Id<"trialMatches">) => {
    setSelectedTrials((prev) =>
      prev.includes(matchId)
        ? prev.filter((id) => id !== matchId)
        : [...prev, matchId]
    );
  };

  // UI Helper Functions
  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800";
    if (score >= 80) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "declined":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "enrolled":
        return <Star className="h-4 w-4 text-purple-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getNotificationStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Bell className="h-4 w-4 text-blue-600" />;
      case "viewed":
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "declined":
        return "bg-red-100 text-red-800";
      case "enrolled":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getResponseText = (match) => {
    if (match.match.patientResponse) {
      return match.match.patientResponse;
    }

    switch (match.match.consentStatus) {
      case "approved":
        return "Patient has expressed interest in this trial.";
      case "declined":
        return "Patient has declined participation in this trial.";
      case "enrolled":
        return "Patient is enrolled in this trial.";
      default:
        return "Waiting for patient response.";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD]">
      <Navbar />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-[#1D1D1F] mb-2">
                  Clinical Trial Matching
                </h1>
                <p className="text-lg text-[#86868B]">
                  Review AI-generated trial matches for your patients and
                  approve suitable opportunities
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Link to="/doctor/consultation?tab=clinical-trials">
                  <Button className="bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Generate New Trials
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap space-x-1 mb-6 bg-[#F5F5F7] p-1 rounded-lg w-fit">
            {["pending", "approved", "declined", "enrolled", "all"].map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status as any)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    filter === status
                      ? "bg-white text-[#1D1D1F] shadow-sm"
                      : "text-[#86868B] hover:text-[#1D1D1F]"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                  {status === "pending" && (
                    <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {trialMatches?.filter(
                        (match) => match.match.consentStatus === "pending"
                      ).length || 0}
                    </span>
                  )}
                </button>
              )
            )}
          </div>

          {/* Bulk Actions */}
          {selectedTrials.length > 0 && (
            <div className="mb-6 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-blue-600" />
                <span className="text-blue-800 font-medium">
                  {selectedTrials.length} trials selected
                </span>
              </div>
              <Button
                onClick={handleSendBulkNotifications}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                ) : (
                  <Bell className="h-4 w-4 mr-2" />
                )}
                Notify Patients
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Trial Matches List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[#1D1D1F]">
                  Trial Matches ({trialMatches?.length || 0})
                </h2>

                {filter === "pending" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (trialMatches?.length) {
                        setSelectedTrials(
                          trialMatches.map((match) => match.match._id)
                        );
                      }
                    }}
                    className="text-xs"
                  >
                    <Filter className="h-3 w-3 mr-1" />
                    Select All
                  </Button>
                )}
              </div>

              {!trialMatches ? (
                <Card className="bg-white p-4">
                  <div className="flex justify-center items-center py-8">
                    <LoadingSpinner />
                  </div>
                </Card>
              ) : trialMatches.length === 0 ? (
                <Card className="bg-white">
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Search className="h-12 w-12 text-[#86868B] mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-[#1D1D1F] mb-2">
                        No Trial Matches Found
                      </h3>
                      <p className="text-[#86868B]">
                        {filter === "pending"
                          ? "No pending trial matches to review."
                          : filter === "approved"
                            ? "No approved trial matches yet."
                            : filter === "declined"
                              ? "No declined trial matches."
                              : filter === "enrolled"
                                ? "No enrolled patients yet."
                                : "No trial matches found."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                trialMatches.map((match) => (
                  <Card
                    key={match.match._id}
                    className={`cursor-pointer transition-all hover:shadow-lg mb-4 ${
                      selectedMatchId === match.match._id
                        ? "ring-2 ring-[#0066CC] bg-[#0066CC]/5"
                        : "bg-white"
                    }`}
                    onClick={() => setSelectedMatchId(match.match._id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <User className="h-4 w-4 text-[#0066CC]" />
                            <span className="font-semibold text-[#1D1D1F]">
                              {match.patient.name}
                            </span>
                            <span className="text-sm text-[#86868B]">
                              ({match.patient.id})
                            </span>
                            {filter === "pending" && (
                              <input
                                type="checkbox"
                                className="ml-2 h-4 w-4 rounded border-gray-300 text-[#0066CC] focus:ring-[#0066CC]"
                                checked={selectedTrials.includes(
                                  match.match._id
                                )}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleTrialSelection(match.match._id);
                                }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                          </div>
                          <h3 className="font-medium text-[#1D1D1F] mb-2 line-clamp-2">
                            {match.trial.title}
                          </h3>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(match.match.consentStatus)}
                          {match.match.notificationStatus !== "pending" &&
                            getNotificationStatusIcon(
                              match.match.notificationStatus
                            )}
                          <Badge
                            className={getScoreColor(
                              match.match.relevanceScore
                            )}
                          >
                            {match.match.relevanceScore}%
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-[#86868B]">
                        <div className="flex items-center space-x-1">
                          <FileText className="h-3 w-3" />
                          <span>{match.trial.phase}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span>
                            {match.trial.location?.split(",")[0] ||
                              (match.trial.locations &&
                              match.trial.locations.length > 0
                                ? match.trial.locations[0].split(",")[0]
                                : "Location N/A")}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(
                              match.match.matchDate
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-1 mb-3">
                        {match.patient.conditions.map((condition, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs"
                          >
                            {condition.name}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {match.match.matchReason &&
                          match.match.matchReason
                            .split(", ")
                            .slice(0, 2)
                            .map((factor, index) => (
                              <Badge
                                key={index}
                                className="bg-[#0066CC]/10 text-[#0066CC] text-xs"
                              >
                                <Star className="h-3 w-3 mr-1" />
                                {factor}
                              </Badge>
                            ))}
                        {match.match.matchReason &&
                          match.match.matchReason.split(", ").length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{match.match.matchReason.split(", ").length - 2}{" "}
                              more
                            </Badge>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Trial Details */}
            <div className="sticky top-8">
              {selectedMatch ? (
                <Card className="bg-white">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <CardTitle className="text-lg">
                          {selectedMatch.trial.title}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {selectedMatch.trial._id.toString().substring(0, 8)} •{" "}
                          {selectedMatch.trial.sponsor}
                        </CardDescription>
                      </div>
                      <Badge
                        className={getScoreColor(
                          selectedMatch.match.relevanceScore
                        )}
                      >
                        {selectedMatch.match.relevanceScore}% Match
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Status Badge */}
                    <div
                      className={`flex items-center space-x-2 p-3 rounded-lg ${getStatusColor(selectedMatch.match.consentStatus)}`}
                    >
                      {getStatusIcon(selectedMatch.match.consentStatus)}
                      <div>
                        <span className="font-medium">
                          {selectedMatch.match.consentStatus
                            .charAt(0)
                            .toUpperCase() +
                            selectedMatch.match.consentStatus.slice(1)}
                        </span>
                        <span className="text-sm ml-2">
                          {selectedMatch.match.notificationStatus === "pending"
                            ? "• Not notified yet"
                            : selectedMatch.match.notificationStatus === "sent"
                              ? "• Notification sent"
                              : "• Notification viewed"}
                        </span>
                      </div>
                    </div>

                    {/* Patient Info */}
                    <div>
                      <h4 className="font-medium text-[#1D1D1F] mb-2">
                        Patient Information
                      </h4>
                      <div className="bg-[#F5F5F7] p-3 rounded-lg">
                        <div className="font-medium">
                          {selectedMatch.patient.name}
                        </div>
                        <div className="text-sm text-[#86868B] mb-2">
                          ID:{" "}
                          {selectedMatch.patient.id.toString().substring(0, 8)}
                          {selectedMatch.patient.age &&
                            ` • Age: ${selectedMatch.patient.age}`}
                          {selectedMatch.patient.gender &&
                            ` • Gender: ${selectedMatch.patient.gender}`}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {selectedMatch.patient.conditions.map(
                            (condition, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="text-xs"
                              >
                                {condition.name}
                                {condition.severity &&
                                  ` (${condition.severity})`}
                              </Badge>
                            )
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Patient Response */}
                    {(selectedMatch.match.consentStatus !== "pending" ||
                      selectedMatch.match.patientResponse) && (
                      <div>
                        <h4 className="font-medium text-[#1D1D1F] mb-2 flex items-center">
                          <MessageCircle className="h-4 w-4 text-[#0066CC] mr-2" />
                          Patient Response
                        </h4>
                        <div
                          className={`p-3 rounded-lg ${
                            selectedMatch.match.consentStatus === "approved"
                              ? "bg-green-50"
                              : selectedMatch.match.consentStatus === "declined"
                                ? "bg-red-50"
                                : "bg-blue-50"
                          }`}
                        >
                          <p
                            className={`text-sm ${
                              selectedMatch.match.consentStatus === "approved"
                                ? "text-green-800"
                                : selectedMatch.match.consentStatus ===
                                    "declined"
                                  ? "text-red-800"
                                  : "text-blue-800"
                            }`}
                          >
                            {getResponseText(selectedMatch)}
                          </p>
                          {selectedMatch.match.responseDate && (
                            <p className="text-xs mt-2 text-gray-500">
                              Responded on{" "}
                              {new Date(
                                selectedMatch.match.responseDate
                              ).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Trial Description */}
                    <div>
                      <h4 className="font-medium text-[#1D1D1F] mb-2">
                        Study Description
                      </h4>
                      <p className="text-sm text-[#86868B] leading-relaxed">
                        {selectedMatch.trial.description}
                      </p>
                    </div>

                    {/* Eligibility Criteria */}
                    <div>
                      <h4 className="font-medium text-[#1D1D1F] mb-2">
                        Eligibility Criteria
                      </h4>
                      <ul className="space-y-1">
                        {selectedMatch.trial.eligibilityCriteria.map(
                          (criteria, index) => (
                            <li
                              key={index}
                              className="text-sm text-[#86868B] flex items-start"
                            >
                              <span className="text-[#0066CC] mr-2">•</span>
                              {criteria}
                            </li>
                          )
                        )}
                      </ul>
                    </div>

                    {/* Matching Factors */}
                    <div>
                      <h4 className="font-medium text-[#1D1D1F] mb-2">
                        Why This Match?
                      </h4>
                      <div className="space-y-2">
                        {selectedMatch.match.matchReason &&
                          selectedMatch.match.matchReason
                            .split(", ")
                            .map((factor, index) => (
                              <div
                                key={index}
                                className="flex items-center space-x-2"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm text-[#86868B]">
                                  {factor}
                                </span>
                              </div>
                            ))}
                      </div>
                    </div>

                    {/* Doctor Notes */}
                    <div>
                      <h4 className="font-medium text-[#1D1D1F] mb-2">
                        Doctor Notes
                      </h4>
                      <Textarea
                        placeholder="Add your notes about this trial match..."
                        value={doctorNotes}
                        onChange={(e) => setDoctorNotes(e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>

                    {/* Action Buttons */}
                    {selectedMatch.match.consentStatus === "pending" && (
                      <div className="flex space-x-3 pt-4 border-t">
                        {selectedMatch.match.notificationStatus ===
                        "pending" ? (
                          <Button
                            onClick={() =>
                              handleSendNotification(selectedMatch.match._id)
                            }
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <LoadingSpinner className="mr-2 h-4 w-4" />
                            ) : (
                              <Bell className="h-4 w-4 mr-2" />
                            )}
                            Notify Patient
                          </Button>
                        ) : (
                          <>
                            <Button
                              onClick={() =>
                                handleApprove(selectedMatch.match._id)
                              }
                              className="flex-1 bg-[#0066CC] hover:bg-[#0077ED]"
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? (
                                <LoadingSpinner className="mr-2 h-4 w-4" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                              )}
                              Approve Match
                            </Button>
                            <Button
                              onClick={() =>
                                handleDecline(selectedMatch.match._id)
                              }
                              variant="outline"
                              className="flex-1"
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? (
                                <LoadingSpinner className="mr-2 h-4 w-4" />
                              ) : (
                                <XCircle className="h-4 w-4 mr-2" />
                              )}
                              Decline
                            </Button>
                          </>
                        )}
                      </div>
                    )}

                    {selectedMatch.match.consentStatus !== "pending" && (
                      <div className="pt-4 border-t">
                        <Button
                          onClick={() => {
                            // Simulating opening a patient details page
                            toast({
                              title: "Patient Details",
                              description:
                                "This would navigate to the patient's details page.",
                            });
                          }}
                          className="w-full"
                        >
                          <User className="h-4 w-4 mr-2" />
                          View Patient Details
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-white">
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Search className="h-12 w-12 text-[#86868B] mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-[#1D1D1F] mb-2">
                        Select a Trial Match
                      </h3>
                      <p className="text-[#86868B]">
                        Choose a trial match from the list to view details and
                        take action
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
