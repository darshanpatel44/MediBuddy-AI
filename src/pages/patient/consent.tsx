import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
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
import { toast } from "@/components/ui/use-toast";
import {
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowLeft,
  Download,
  Eye,
  ExternalLink,
  X,
} from "lucide-react";

export default function ConsentPage() {
  const { user } = useUser();
  const userData = useQuery(
    api.users.getUserByToken,
    user?.id ? { tokenIdentifier: user.id } : "skip"
  );

  const patientId = userData?._id;

  // Mutation for updating consent status
  const updateMatchStatus = useMutation(api.trialMatching.updateMatchStatus);

  // Handle signing consent
  const handleSignConsent = async (formId: string) => {
    try {
      await updateMatchStatus({
        matchId: formId as any, // The notification ID should map to match ID
        status: "enrolled",
        doctorNotes: "Patient consent signed",
      });

      toast({
        title: "Consent Signed",
        description:
          "You have successfully signed the consent form for this trial.",
      });
    } catch (error) {
      console.error("Error signing consent:", error);
      toast({
        title: "Consent Failed",
        description: "Failed to sign consent. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle declining consent
  const handleDeclineConsent = async (formId: string) => {
    try {
      await updateMatchStatus({
        matchId: formId as any,
        status: "declined",
        doctorNotes: "Patient declined consent",
      });

      toast({
        title: "Consent Declined",
        description: "You have declined to participate in this trial.",
      });
    } catch (error) {
      console.error("Error declining consent:", error);
      toast({
        title: "Decline Failed",
        description: "Failed to decline consent. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Fetch notifications to get consent forms
  const notifications = useQuery(
    api.notifications.getPatientNotifications,
    patientId ? { patientId } : "skip"
  );

  // Filter notifications to get consent forms
  const consentForms =
    notifications?.map((notification) => ({
      id: notification.id,
      trialTitle: notification.trialTitle,
      trialSponsor: notification.trialSponsor,
      trialPhase: notification.trialPhase,
      nctId: notification.nctId,
      status: notification.consentStatus,
      matchDate: notification.matchDate,
      relevanceScore: notification.relevanceScore,
      requirements: [
        "Patient must be 18 years or older",
        "Must have confirmed diagnosis",
        "No prior participation in similar trials",
        "Willing to commit to study duration",
      ],
      documents: [
        "Informed Consent Form",
        "Medical History Release",
        "Emergency Contact Information",
      ],
    })) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800">Ready to Sign</Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            Pending Review
          </Badge>
        );
      case "enrolled":
        return <Badge className="bg-blue-100 text-blue-800">Enrolled</Badge>;
      case "declined":
        return <Badge className="bg-red-100 text-red-800">Declined</Badge>;
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800">Unknown Status</Badge>
        );
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "enrolled":
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-red-600" />;
    }
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
              Consent Forms
            </h1>
            <p className="text-lg text-[#86868B]">
              Review and sign consent forms for clinical trial participation
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#86868B]">
                  Total Forms
                </CardTitle>
                <FileText className="h-4 w-4 text-[#0066CC]" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#1D1D1F]">
                  {consentForms.length}
                </div>
                <p className="text-xs text-[#86868B] mt-1">Available forms</p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#86868B]">
                  Pending
                </CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#1D1D1F]">
                  {
                    consentForms.filter((form) => form.status === "pending")
                      .length
                  }
                </div>
                <p className="text-xs text-[#86868B] mt-1">
                  Awaiting doctor review
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-[#86868B]">
                  Ready to Sign
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#1D1D1F]">
                  {
                    consentForms.filter((form) => form.status === "approved")
                      .length
                  }
                </div>
                <p className="text-xs text-[#86868B] mt-1">
                  Ready for signature
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Consent Forms List */}
          <div className="space-y-6">
            {consentForms.length > 0 ? (
              consentForms.map((form) => (
                <Card key={form.id} className="bg-white">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {getStatusIcon(form.status)}
                        <div>
                          <CardTitle className="text-lg">
                            {form.trialTitle}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            Sponsored by {form.trialSponsor} • Phase{" "}
                            {form.trialPhase}
                            {form.nctId && (
                              <>
                                {" • "}
                                <a
                                  href={`https://clinicaltrials.gov/study/${form.nctId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#0066CC] hover:underline inline-flex items-center"
                                >
                                  {form.nctId}
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                              </>
                            )}
                          </CardDescription>
                          <div className="flex items-center mt-2 space-x-4">
                            <span className="text-sm text-[#86868B]">
                              Match: {form.relevanceScore}%
                            </span>
                            <span className="text-sm text-[#86868B]">
                              Received:{" "}
                              {new Date(form.matchDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(form.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Requirements */}
                      <div>
                        <h4 className="font-medium text-[#1D1D1F] mb-3">
                          Study Requirements
                        </h4>
                        <ul className="space-y-2">
                          {form.requirements.map((req, index) => (
                            <li
                              key={index}
                              className="flex items-start space-x-2 text-sm text-[#86868B]"
                            >
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span>{req}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Documents */}
                      <div>
                        <h4 className="font-medium text-[#1D1D1F] mb-3">
                          Required Documents
                        </h4>
                        <div className="space-y-2">
                          {form.documents.map((doc, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 rounded-lg bg-[#F5F5F7]"
                            >
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-[#0066CC]" />
                                <span className="text-sm text-[#1D1D1F]">
                                  {doc}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* ClinicalTrials.gov Link */}
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                          window.open(
                            `https://clinicaltrials.gov/study/${form.nctId || "search"}`,
                            "_blank"
                          )
                        }
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Full Study on ClinicalTrials.gov
                      </Button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                      <div className="text-sm text-[#86868B]">
                        {form.status === "pending"
                          ? "Waiting for doctor review before you can sign consent"
                          : form.status === "approved"
                            ? "Consent approved by doctor - you can now sign"
                            : form.status === "enrolled"
                              ? "Successfully enrolled in trial"
                              : "Consent declined"}
                      </div>
                      <div className="flex items-center space-x-3">
                        {form.status === "pending" && (
                          <>
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <Clock className="h-4 w-4 mr-1" />
                              Pending Doctor Review
                            </Badge>
                            <Button
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleDeclineConsent(form.id)}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Deny
                            </Button>
                          </>
                        )}
                        {form.status === "approved" && (
                          <>
                            <div className="flex gap-2">
                              <Button
                                className="bg-[#0066CC] hover:bg-[#0052A3]"
                                onClick={() => handleSignConsent(form.id)}
                              >
                                Sign Consent
                              </Button>
                              <Button
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => handleDeclineConsent(form.id)}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Deny
                              </Button>
                            </div>
                          </>
                        )}
                        {form.status === "enrolled" && (
                          <>
                            <Button variant="outline">
                              <Download className="h-4 w-4 mr-2" />
                              Download Copy
                            </Button>
                            <Button
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleDeclineConsent(form.id)}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Deny
                            </Button>
                          </>
                        )}
                        {form.status === "declined" && (
                          <Button variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Download Copy
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-white">
                <CardContent className="text-center py-12">
                  <FileText className="h-12 w-12 text-[#86868B] mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-[#1D1D1F] mb-2">
                    No Consent Forms Available
                  </h3>
                  <p className="text-[#86868B] mb-4">
                    You don't have any consent forms to review at this time.
                  </p>
                  <Link to="/patient/dashboard">
                    <Button variant="outline">Return to Dashboard</Button>
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
