import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  getPatientAgent,
  getPatientNotificationsWithAgent,
  updatePatientConsentWithAgent,
  askTrialQuestionWithAgent,
} from "@/agents";
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
import {
  Bell,
  Star,
  CheckCircle,
  FileText,
  Clock,
  MapPin,
  Calendar,
  User,
  Phone,
  Mail,
  ExternalLink,
  AlertCircle,
  Heart,
  Info,
  XCircle,
  BrainCircuit,
  MessageSquarePlus,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function PatientNotifications() {
  // State
  const [selectedNotificationId, setSelectedNotificationId] =
    useState<Id<"trialMatches"> | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "action_required">(
    "all"
  );
  const [patientResponse, setPatientResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const [agentEnhancedNotifications, setAgentEnhancedNotifications] =
    useState<any>(null);
  const [isAgentProcessing, setIsAgentProcessing] = useState(false);

  // Get the Convex client for agent operations
  const convex = useConvex();

  // User data
  const { user } = useUser();
  const userData = useQuery(
    api.users.getUserByToken,
    user?.id ? { tokenIdentifier: user.id } : "skip"
  );
  const patientId = userData?._id;

  // Fetch notifications
  const notifications = useQuery(
    api.notifications.getPatientNotifications,
    patientId ? { patientId } : "skip"
  );

  // Get unread and action required counts
  const unreadCount =
    useQuery(
      api.notifications.getUnreadNotificationCount,
      patientId ? { patientId } : "skip"
    ) || 0;

  const actionRequiredCount =
    useQuery(
      api.notifications.getActionRequiredNotificationCount,
      patientId ? { patientId } : "skip"
    ) || 0;

  // Use the patient agent to process notifications
  useEffect(() => {
    const processNotificationsWithAgent = async () => {
      if (patientId && notifications) {
        try {
          setIsAgentProcessing(true);

          // Get the patient agent to process notifications
          const result = await getPatientNotificationsWithAgent(patientId);

          if (result.success) {
            setAgentEnhancedNotifications(result.data);
          } else {
            console.error(
              "Error processing notifications with agent:",
              result.error
            );
          }
        } catch (error) {
          console.error("Error in agent notification processing:", error);
        } finally {
          setIsAgentProcessing(false);
        }
      }
    };

    processNotificationsWithAgent();
  }, [patientId, notifications]);

  // Mutations
  const markNotificationViewed = useMutation(
    api.notifications.markNotificationViewed
  );
  const updateConsent = useMutation(api.notifications.updatePatientConsent);

  // Get selected notification
  const selectedNotification =
    notifications?.find((n) => n.id === selectedNotificationId) || null;

  // Filter notifications
  const filteredNotifications =
    notifications?.filter((notification) => {
      if (filter === "unread")
        return notification.notificationStatus === "sent";
      if (filter === "action_required")
        return notification.consentStatus === "pending";
      return true;
    }) || [];

  // Handle notification selection
  const handleSelectNotification = async (
    notificationId: Id<"trialMatches">
  ) => {
    setSelectedNotificationId(notificationId);

    // Mark notification as viewed if it's unread
    const notification = notifications?.find((n) => n.id === notificationId);
    if (notification && notification.notificationStatus === "sent") {
      try {
        await markNotificationViewed({ notificationId });
      } catch (error) {
        console.error("Failed to mark notification as viewed:", error);
      }
    }
  };

  // Handle consent responses with agent
  const handleConsentResponse = async (
    notificationId: Id<"trialMatches">,
    status: "approved" | "declined" | "pending"
  ) => {
    setIsSubmitting(true);

    try {
      if (!patientId) {
        throw new Error("Patient ID is required");
      }

      // Use the patient agent to update consent
      const result = await updatePatientConsentWithAgent(
        patientId,
        notificationId,
        status,
        patientResponse
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to update consent with agent");
      }

      toast({
        title:
          status === "approved" ? "You're interested!" : "Response recorded",
        description:
          status === "approved"
            ? "Your interest has been recorded and sent to your doctor."
            : "Your response has been recorded. Thank you for your feedback.",
        variant: status === "approved" ? "default" : "destructive",
      });

      setPatientResponse("");
    } catch (error) {
      console.error("Failed to update consent:", error);

      // Fallback to direct API call if agent fails
      try {
        await updateConsent({
          matchId: notificationId,
          consentStatus: status,
          patientResponse: patientResponse,
        });

        toast({
          title: "Response recorded",
          description: "Your response has been recorded using fallback method.",
          variant: "default",
        });
      } catch (fallbackError) {
        toast({
          title: "Error",
          description: "Failed to submit your response. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle asking a question about a trial
  const handleAskQuestion = async () => {
    if (!selectedNotification || !questionText || !patientId) {
      toast({
        title: "Error",
        description: "Please select a trial and enter your question.",
        variant: "destructive",
      });
      return;
    }

    setIsAskingQuestion(true);

    try {
      // Use the patient agent to ask the question
      const result = await askTrialQuestionWithAgent(
        patientId,
        selectedNotification.id,
        questionText
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to send question");
      }

      toast({
        title: "Question Sent",
        description:
          "Your question has been sent to your doctor. You'll be notified when they respond.",
        variant: "default",
      });

      setQuestionText("");
    } catch (error) {
      console.error("Failed to send question:", error);
      toast({
        title: "Error",
        description: "Failed to send your question. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAskingQuestion(false);
    }
  };

  // Helper functions for notification formatting
  const getNotificationIcon = (notification: any): JSX.Element => {
    if (notification.consentStatus === "approved") {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else if (notification.consentStatus === "declined") {
      return <XCircle className="h-5 w-5 text-red-600" />;
    } else if (
      notification.consentStatus === "pending" &&
      notification.notificationStatus === "viewed"
    ) {
      return <FileText className="h-5 w-5 text-orange-600" />;
    } else {
      return <Star className="h-5 w-5 text-blue-600" />;
    }
  };

  const getNotificationType = (notification: any): string => {
    if (notification.consentStatus === "approved") {
      return "approved";
    } else if (notification.consentStatus === "declined") {
      return "declined";
    } else if (
      notification.consentStatus === "pending" &&
      notification.notificationStatus === "viewed"
    ) {
      return "consent_required";
    } else {
      return "new_match";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "new_match":
        return "bg-blue-100 text-blue-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "declined":
        return "bg-red-100 text-red-800";
      case "consent_required":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getNotificationTitle = (notification: any): string => {
    if (notification.consentStatus === "approved") {
      return "Trial Participation Approved";
    } else if (notification.consentStatus === "declined") {
      return "Trial Participation Declined";
    } else if (
      notification.consentStatus === "pending" &&
      notification.notificationStatus === "viewed"
    ) {
      return "Consent Form Required";
    } else {
      return "New Clinical Trial Match Found";
    }
  };

  const getNotificationDescription = (notification: any): string => {
    if (notification.consentStatus === "approved") {
      return (
        notification.trialTitle + " - Your participation has been approved"
      );
    } else if (notification.consentStatus === "declined") {
      return notification.trialTitle + " - You have declined participation";
    } else if (
      notification.consentStatus === "pending" &&
      notification.notificationStatus === "viewed"
    ) {
      return "Please review and respond to " + notification.trialTitle;
    } else {
      return (
        notification.trialTitle +
        " - " +
        notification.relevanceScore +
        "% match for your condition"
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFD]">
      <Navbar />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-[#1D1D1F] mb-2">
              Trial Notifications
            </h1>
            <p className="text-lg text-[#86868B]">
              Stay updated on clinical trial matches and important information
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-1 mb-6 bg-[#F5F5F7] p-1 rounded-lg w-fit">
            {[
              { key: "all", label: "All" },
              { key: "unread", label: "Unread" },
              { key: "action_required", label: "Action Required" },
            ].map((filterOption) => (
              <button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key as any)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === filterOption.key
                    ? "bg-white text-[#1D1D1F] shadow-sm"
                    : "text-[#86868B] hover:text-[#1D1D1F]"
                }`}
              >
                {filterOption.label}
                {filterOption.key === "unread" && unreadCount > 0 && (
                  <span className="ml-2 bg-[#0066CC] text-white text-xs px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
                {filterOption.key === "action_required" &&
                  actionRequiredCount > 0 && (
                    <span className="ml-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {actionRequiredCount}
                    </span>
                  )}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Notifications List */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-[#1D1D1F] mb-4">
                Notifications ({filteredNotifications.length})
              </h2>

              {notifications ? (
                filteredNotifications.length > 0 ? (
                  filteredNotifications.map((notification) => (
                    <Card
                      key={notification.id}
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        selectedNotificationId === notification.id
                          ? "ring-2 ring-[#0066CC] bg-[#0066CC]/5"
                          : notification.notificationStatus === "sent"
                            ? "bg-white border-l-4 border-l-[#0066CC]"
                            : "bg-white"
                      }`}
                      onClick={() => handleSelectNotification(notification.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="flex-shrink-0 mt-1">
                              {getNotificationIcon(notification)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-[#1D1D1F] text-sm">
                                  {getNotificationTitle(notification)}
                                </h3>
                                <div className="flex items-center space-x-2">
                                  {notification.consentStatus === "pending" && (
                                    <AlertCircle className="h-4 w-4 text-orange-500" />
                                  )}
                                  {notification.notificationStatus ===
                                    "sent" && (
                                    <div className="w-2 h-2 bg-[#0066CC] rounded-full"></div>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm text-[#86868B] mb-3">
                                {getNotificationDescription(notification)}
                              </p>
                              <div className="flex items-center justify-between">
                                <Badge
                                  className={getTypeColor(
                                    getNotificationType(notification)
                                  )}
                                >
                                  {getNotificationType(notification).replace(
                                    "_",
                                    " "
                                  )}
                                </Badge>
                                <span className="text-xs text-[#86868B]">
                                  {new Date(
                                    notification.matchDate
                                  ).toLocaleDateString()}
                                </span>
                                {agentEnhancedNotifications?.topPriority?.id ===
                                  notification.id && (
                                  <Badge className="bg-purple-100 text-purple-800 flex items-center">
                                    <BrainCircuit className="h-3 w-3 mr-1" />
                                    Agent Recommended
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))
                ) : (
                  <Card className="bg-white">
                    <CardContent className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <Bell className="h-12 w-12 text-[#86868B] mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-[#1D1D1F] mb-2">
                          No notifications found
                        </h3>
                        <p className="text-[#86868B]">
                          {filter === "unread"
                            ? "You're all caught up! No unread notifications."
                            : filter === "action_required"
                              ? "No actions required at this time."
                              : "You don't have any notifications yet."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )
              ) : (
                <Card className="bg-white p-4">
                  <div className="flex justify-center items-center py-8">
                    <LoadingSpinner />
                  </div>
                </Card>
              )}
            </div>

            {/* Notification Details */}
            <div className="sticky top-8">
              {selectedNotification ? (
                <Card className="bg-white">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(selectedNotification)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {getNotificationTitle(selectedNotification)}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {getNotificationDescription(selectedNotification)}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        className={getTypeColor(
                          getNotificationType(selectedNotification)
                        )}
                      >
                        {getNotificationType(selectedNotification).replace(
                          "_",
                          " "
                        )}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Trial Overview */}
                    <div>
                      <h4 className="font-medium text-[#1D1D1F] mb-3 flex items-center">
                        <Heart className="h-4 w-4 text-[#0066CC] mr-2" />
                        Trial Information
                      </h4>
                      <div className="bg-[#F5F5F7] p-4 rounded-lg space-y-3">
                        <div>
                          <h5 className="font-medium text-[#1D1D1F] mb-1">
                            {selectedNotification.trialTitle}
                          </h5>
                          <div className="flex items-center space-x-4 text-sm text-[#86868B] mb-2">
                            <span>{selectedNotification.trialPhase}</span>
                            <span>•</span>
                            <span>{selectedNotification.trialSponsor}</span>
                          </div>
                          <Badge className="bg-green-100 text-green-800 mb-2">
                            {selectedNotification.relevanceScore}% Match
                          </Badge>
                        </div>

                        <div className="flex items-start space-x-2">
                          <MapPin className="h-4 w-4 text-[#86868B] mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-[#86868B]">
                            {selectedNotification.location ||
                              (selectedNotification.locations &&
                              selectedNotification.locations.length > 0
                                ? selectedNotification.locations[0]
                                : "Location information not available")}
                          </span>
                        </div>

                        <div className="flex items-start space-x-2">
                          <Phone className="h-4 w-4 text-[#86868B] mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-[#86868B]">
                            {selectedNotification.contactInfo ||
                              "Contact information not available"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Study Description */}
                    <div>
                      <h4 className="font-medium text-[#1D1D1F] mb-2">
                        Study Description
                      </h4>
                      <p className="text-sm text-[#86868B] leading-relaxed">
                        {selectedNotification.trialDescription}
                      </p>
                    </div>

                    {/* Eligibility Criteria */}
                    <div>
                      <h4 className="font-medium text-[#1D1D1F] mb-2">
                        Eligibility Criteria
                      </h4>
                      <ul className="space-y-1">
                        {(selectedNotification.eligibilityCriteria || []).map(
                          (criteria, index) => (
                            <li
                              key={index}
                              className="text-sm text-[#86868B] flex items-start"
                            >
                              <CheckCircle className="h-3 w-3 text-green-600 mr-2 mt-1 flex-shrink-0" />
                              {criteria}
                            </li>
                          )
                        )}
                        {(selectedNotification.inclusionCriteria || []).map(
                          (criteria, index) => (
                            <li
                              key={`inclusion-${index}`}
                              className="text-sm text-[#86868B] flex items-start"
                            >
                              <CheckCircle className="h-3 w-3 text-green-600 mr-2 mt-1 flex-shrink-0" />
                              {criteria}
                            </li>
                          )
                        )}
                      </ul>
                    </div>

                    {/* Doctor Notes */}
                    {selectedNotification.doctorNotes && (
                      <div>
                        <h4 className="font-medium text-[#1D1D1F] mb-2">
                          Doctor's Notes
                        </h4>
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="flex items-start space-x-2">
                            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-blue-800">
                              {selectedNotification.doctorNotes}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {selectedNotification.consentStatus === "pending" && (
                      <div className="pt-4 border-t">
                        <div className="space-y-3">
                          <p className="text-sm text-[#86868B] mb-3">
                            Are you interested in participating in this clinical
                            trial?
                          </p>

                          <Textarea
                            placeholder="Add any questions or comments about this trial... (optional)"
                            value={patientResponse}
                            onChange={(e) => setPatientResponse(e.target.value)}
                            className="min-h-[100px] mb-3"
                          />

                          <div className="flex space-x-3">
                            <Button
                              onClick={() =>
                                handleConsentResponse(
                                  selectedNotification.id,
                                  "approved"
                                )
                              }
                              className="flex-1 bg-[#0066CC] hover:bg-[#0077ED]"
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? (
                                <LoadingSpinner className="mr-2 h-4 w-4" />
                              ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                              )}
                              I'm Interested
                            </Button>
                            <Button
                              onClick={() =>
                                handleConsentResponse(
                                  selectedNotification.id,
                                  "declined"
                                )
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
                              Not Interested
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Ask a Question Section */}
                    {selectedNotification.consentStatus !== "pending" && (
                      <div className="pt-4 border-t">
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-[#1D1D1F] flex items-center">
                            <MessageSquarePlus className="h-4 w-4 mr-2 text-[#0066CC]" />
                            Have a question about this trial?
                          </p>

                          <Textarea
                            placeholder="Type your question here..."
                            value={questionText}
                            onChange={(e) => setQuestionText(e.target.value)}
                            className="min-h-[100px] mb-3"
                          />

                          <Button
                            onClick={handleAskQuestion}
                            className="w-full bg-[#0066CC] hover:bg-[#0077ED]"
                            disabled={isAskingQuestion || !questionText.trim()}
                          >
                            {isAskingQuestion ? (
                              <>
                                <LoadingSpinner className="mr-2 h-4 w-4" />
                                Sending question...
                              </>
                            ) : (
                              <>
                                <BrainCircuit className="h-4 w-4 mr-2" />
                                Ask Doctor via Agent
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedNotification.consentStatus === "approved" && (
                      <div className="pt-4 border-t">
                        <div className="space-y-3">
                          <div className="bg-green-50 p-3 rounded-lg">
                            <div className="flex items-center space-x-2 text-green-800">
                              <CheckCircle className="h-4 w-4" />
                              <span className="font-medium">
                                You're Interested in This Trial
                              </span>
                            </div>
                            <p className="text-sm text-green-700 mt-1">
                              Your doctor has approved your participation. The
                              research team will contact you soon.
                            </p>
                          </div>
                          <Button className="w-full bg-[#0066CC] hover:bg-[#0077ED]">
                            <Phone className="h-4 w-4 mr-2" />
                            Contact Research Team
                          </Button>
                        </div>
                      </div>
                    )}

                    {selectedNotification.consentStatus === "pending" &&
                      selectedNotification.type === "consent_required" && (
                        <div className="pt-4 border-t">
                          <div className="space-y-3">
                            <p className="text-sm text-[#86868B]">
                              Please review the informed consent document before
                              proceeding.
                            </p>
                            <Button className="w-full bg-[#0066CC] hover:bg-[#0077ED]">
                              <FileText className="h-4 w-4 mr-2" />
                              Review Consent Form
                            </Button>
                          </div>
                        </div>
                      )}

                    {/* Additional Actions */}
                    <div className="pt-4 border-t">
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <ExternalLink className="h-3 w-3 mr-2" />
                          Learn More
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Mail className="h-3 w-3 mr-2" />
                          Contact Support
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-white">
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Bell className="h-12 w-12 text-[#86868B] mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-[#1D1D1F] mb-2">
                        Select a Notification
                      </h3>
                      <p className="text-[#86868B]">
                        Choose a notification from the list to view details and
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
