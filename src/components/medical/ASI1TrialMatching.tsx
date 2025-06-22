import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import {
  Loader2,
  Brain,
  Search,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Check,
  X,
  Clock,
} from "lucide-react";
import { toast } from "../ui/use-toast";

interface ASI1TrialMatchingProps {
  consultationId: Id<"consultations">;
  patientId: Id<"users">;
}

interface TrialMatch {
  nctId: string;
  title: string;
  description: string;
  sponsor: string;
  phase: string;
  status: string;
  conditions: string[];
  relevanceScore?: number;
  asi1Analysis?: {
    reasoning: string;
    benefits: string[];
    risks: string[];
    confidence: number;
  };
  sourceUrl: string;
  locations: string[];
  ageRange?: {
    min: number;
    max: number;
  };
  genderRestriction?: string;
  eligibilityCriteria?: string[];
  exclusionCriteria?: string[];
}

interface ASI1Enhancement {
  reasoning: string;
  confidence: number;
  medicalInsights: string[];
  riskAssessment: {
    level: "low" | "medium" | "high";
    factors: string[];
  };
  recommendations: any[];
}

export function ASI1TrialMatching({
  consultationId,
  patientId,
}: ASI1TrialMatchingProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [realTimeTrials, setRealTimeTrials] = useState<TrialMatch[]>([]);
  const [asi1Enhancement, setASI1Enhancement] =
    useState<ASI1Enhancement | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Get consultation data
  const consultation = useQuery(api.consultations.get, { id: consultationId });
  const patient = useQuery(api.users.getById, { id: patientId });
  const currentUser = useQuery(api.users.getCurrentUser);
  const savedTrials = useQuery(
    api.clinicalTrials.getSavedTrialsForConsultation,
    {
      consultationId,
    }
  );

  // Combine real-time search results with saved trials from database
  const allTrials = React.useMemo(() => {
    const combined: TrialMatch[] = [];

    // Add real-time search results
    combined.push(...realTimeTrials);

    // Add saved trials from database (if not already in real-time results)
    if (savedTrials) {
      for (const savedTrialData of savedTrials) {
        const { trial, match } = savedTrialData;

        // Check if this trial is already in real-time results
        const existsInRealTime = realTimeTrials.some(
          (rt) =>
            rt.nctId === trial.nctId ||
            rt.nctId === trial.enhancedContactInfo?.nctId ||
            rt.title === trial.title
        );

        if (!existsInRealTime) {
          // Convert database trial to TrialMatch format
          const trialMatch: TrialMatch = {
            nctId:
              trial.nctId ||
              trial.enhancedContactInfo?.nctId ||
              `db-${trial._id}`,
            title: trial.title,
            description: trial.description,
            sponsor: trial.sponsor,
            phase: trial.phase,
            status: trial.status,
            conditions: trial.targetConditions,
            sourceUrl:
              trial.enhancedContactInfo?.sourceUrl || trial.contactInfo,
            locations: trial.locations || [trial.location],
            relevanceScore: match.relevanceScore,
            ageRange: trial.ageRange,
            genderRestriction: trial.genderRestriction,
            eligibilityCriteria: trial.eligibilityCriteria,
            exclusionCriteria: trial.exclusionCriteria,
          };
          combined.push(trialMatch);
        }
      }
    }

    return combined;
  }, [realTimeTrials, savedTrials]);

  // Actions and Mutations for ASI1 and ClinicalTrials.gov integration
  const searchRealTimeTrials = useAction(
    api.clinicalTrials.findMatchingTrialsRealTime
  );
  const enhanceWithASI1 = useMutation(api.asi1.enhanceMedicalAnalysis);
  const analyzeTrials = useMutation(api.asi1.analyzeTrialMatches);
  const saveTrialResults = useMutation(
    api.clinicalTrials.saveTrialSearchResults
  );
  const updateMatchStatus = useMutation(api.trialMatching.updateMatchStatus);

  // Search for real-time clinical trials
  const handleSearchRealTimeTrials = async () => {
    if (!consultation?.structuredData && !consultation?.transcription) {
      toast({
        title: "No Medical Data",
        description:
          "Please ensure you have consultation data with transcription or extracted medical entities first.",
        variant: "destructive",
      });
      return;
    }

    // Check if we have structured data, if not warn user but still allow search
    if (!consultation?.structuredData) {
      toast({
        title: "Limited Data Available",
        description:
          "Searching with transcription only. For better results, extract medical entities first.",
        variant: "default",
      });
    }

    setIsSearching(true);
    try {
      console.log("Starting clinical trial search...");

      const results = await searchRealTimeTrials({
        consultationId,
        useRealTimeData: true,
      });

      setRealTimeTrials(results.trials);

      // Save trial results to database
      try {
        console.log("Saving trial results to database...");
        const saveResult = await saveTrialResults({
          consultationId,
          patientId,
          trials: results.trials.map((trial) => ({
            nctId: trial.nctId || `temp-${Date.now()}-${Math.random()}`,
            title: trial.title,
            description: trial.description,
            sponsor: trial.sponsor,
            phase: trial.phase,
            status: trial.status,
            conditions: trial.conditions || [],
            sourceUrl: trial.sourceUrl,
            locations: trial.locations || [],
            relevanceScore: trial.relevanceScore,
            ageRange: trial.ageRange,
            genderRestriction: trial.genderRestriction,
            eligibilityCriteria: trial.eligibilityCriteria,
            exclusionCriteria: trial.exclusionCriteria,
          })),
        });

        console.log(
          `Successfully saved ${saveResult.totalSaved} trials to database`
        );

        toast({
          title: "Search & Save Complete",
          description: `Found ${results.trials.length} trials and saved ${saveResult.totalSaved} to database`,
        });
      } catch (saveError) {
        console.error("Error saving trials to database:", saveError);
        toast({
          title: "Search Complete (Save Warning)",
          description: `Found ${results.trials.length} trials but couldn't save to database. You can still view the results.`,
          variant: "default",
        });
      }

      // Enhance with ASI1 analysis if we have trials
      if (results.trials.length > 0 && consultation.structuredData) {
        try {
          console.log("Starting ASI1 enhancement...");

          const enhancement = await enhanceWithASI1({
            consultationId,
            extractedEntities: consultation.structuredData,
          });

          setASI1Enhancement(enhancement);

          // Analyze trials with ASI1 (optional - won't fail if ASI1 is unavailable)
          try {
            const trialAnalysis = await analyzeTrials({
              consultationId,
              trialMatches: results.trials,
              medicalContext: {
                patientId,
                consultationId,
                extractedEntities: consultation.structuredData,
                asi1Analysis: enhancement,
              },
            });

            console.log("ASI1 trial analysis completed:", trialAnalysis);
          } catch (analysisError) {
            console.warn(
              "ASI1 trial analysis failed, continuing without it:",
              analysisError
            );
          }

          toast({
            title: "ASI1 Analysis Complete",
            description: `Enhanced analysis completed with ${Math.round(enhancement.confidence * 100)}% confidence`,
          });
        } catch (enhancementError) {
          console.warn(
            "ASI1 enhancement failed, continuing with basic analysis:",
            enhancementError
          );
          toast({
            title: "Basic Analysis Complete",
            description:
              "Trial search completed successfully (enhanced analysis not available)",
          });
        }
      } else if (results.trials.length === 0) {
        toast({
          title: "No Trials Found",
          description:
            "No matching clinical trials found for the current medical profile. Try adjusting search criteria.",
        });
      }
    } catch (error) {
      console.error("Error searching trials:", error);

      // Provide more detailed error information
      let errorMessage = "Failed to search clinical trials. Please try again.";
      let errorTitle = "Search Failed";

      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes("rate limit")) {
          errorTitle = "Rate Limit Exceeded";
          errorMessage = "Please wait a moment and try again.";
        } else if (message.includes("network") || message.includes("fetch")) {
          errorTitle = "Network Error";
          errorMessage = "Please check your connection and try again.";
        } else if (message.includes("consultation not found")) {
          errorTitle = "Consultation Not Found";
          errorMessage =
            "The consultation data could not be found. Please refresh the page.";
        } else if (message.includes("patient data not found")) {
          errorTitle = "Patient Profile Missing";
          errorMessage =
            "Patient profile data is missing. Please ensure the patient profile is complete.";
        } else if (message.includes("no medical conditions found")) {
          errorTitle = "No Medical Conditions Found";
          errorMessage =
            "No medical conditions could be extracted from the consultation. Please ensure the consultation contains medical information.";
        } else if (message.includes("no medical data available")) {
          errorTitle = "No Medical Data";
          errorMessage =
            "The consultation needs either a transcription or extracted medical entities to search for trials.";
        } else if (
          message.includes("consultation or structured data not found")
        ) {
          errorTitle = "Data Processing Required";
          errorMessage =
            "Please extract medical entities from the consultation first, or ensure the consultation has valid transcription data.";
        }
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Handle trial approval
  const handleApproveTrial = async (trialMatchId: string, notes?: string) => {
    try {
      await updateMatchStatus({
        matchId: trialMatchId as Id<"trialMatches">,
        status: "approved",
        doctorNotes: notes || "Approved by doctor",
      });

      toast({
        title: "Trial Approved",
        description: "The clinical trial has been approved for the patient.",
      });
    } catch (error) {
      console.error("Error approving trial:", error);
      toast({
        title: "Approval Failed",
        description: "Failed to approve the trial. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle trial denial
  const handleDenyTrial = async (trialMatchId: string, notes?: string) => {
    try {
      await updateMatchStatus({
        matchId: trialMatchId as Id<"trialMatches">,
        status: "declined",
        doctorNotes: notes || "Declined by doctor",
      });

      toast({
        title: "Trial Declined",
        description: "The clinical trial has been declined for the patient.",
      });
    } catch (error) {
      console.error("Error declining trial:", error);
      toast({
        title: "Decline Failed",
        description: "Failed to decline the trial. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Patient consent handlers
  const handleSignConsent = async (trialMatchId: string) => {
    try {
      await updateMatchStatus({
        matchId: trialMatchId as Id<"trialMatches">,
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

  const handleDeclineConsent = async (trialMatchId: string) => {
    try {
      await updateMatchStatus({
        matchId: trialMatchId as Id<"trialMatches">,
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

  // Check if current user is a patient
  const isPatientView =
    currentUser?.role === "patient" || currentUser?._id === patientId;

  // Get trial match ID from saved trials
  const getTrialMatchId = (trial: TrialMatch): string | null => {
    if (!savedTrials) return null;

    const matchedSavedTrial = savedTrials.find(
      (savedTrial) =>
        savedTrial.trial.enhancedContactInfo?.nctId === trial.nctId ||
        savedTrial.trial.title === trial.title
    );

    return matchedSavedTrial?.match._id || null;
  };

  // Get trial match status
  const getTrialMatchStatus = (
    trial: TrialMatch
  ): "pending" | "approved" | "declined" | "enrolled" | null => {
    if (!savedTrials) return null;

    const matchedSavedTrial = savedTrials.find(
      (savedTrial) =>
        savedTrial.trial.enhancedContactInfo?.nctId === trial.nctId ||
        savedTrial.trial.title === trial.title
    );

    return matchedSavedTrial?.match.status || null;
  };

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  // Get risk level color
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "low":
        return "text-green-600";
      case "medium":
        return "text-yellow-600";
      case "high":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  if (!consultation || !patient) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading consultation data...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            ASI1 Enhanced Clinical Trial Matching
          </CardTitle>
          <CardDescription>
            Advanced AI-powered trial matching using fetch.ai's ASI1 agent and
            real-time ClinicalTrials.gov data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={handleSearchRealTimeTrials}
              disabled={
                isSearching ||
                (!consultation.structuredData && !consultation.transcription)
              }
              className="flex items-center gap-2"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {isSearching
                ? "Searching & Analyzing..."
                : "Search Real-time Trials"}
            </Button>

            {allTrials.length > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {allTrials.length} trials total
              </Badge>
            )}

            {realTimeTrials.length > 0 && (
              <Badge variant="outline" className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {realTimeTrials.length} from search
              </Badge>
            )}

            {savedTrials && savedTrials.length > 0 && (
              <Badge variant="outline" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {savedTrials.length} saved in database
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ASI1 Enhancement Overview */}
      {asi1Enhancement && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              ASI1 Medical Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Confidence Score</h4>
                <div className="flex items-center gap-2">
                  <Progress
                    value={asi1Enhancement.confidence * 100}
                    className="flex-1"
                  />
                  <span
                    className={`font-semibold ${getConfidenceColor(asi1Enhancement.confidence)}`}
                  >
                    {Math.round(asi1Enhancement.confidence * 100)}%
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Risk Assessment</h4>
                <Badge
                  variant="outline"
                  className={getRiskLevelColor(
                    asi1Enhancement.riskAssessment.level
                  )}
                >
                  {asi1Enhancement.riskAssessment.level.toUpperCase()} RISK
                </Badge>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">ASI1 Reasoning</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                {asi1Enhancement.reasoning}
              </p>
            </div>

            {asi1Enhancement.medicalInsights.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Medical Insights</h4>
                <ul className="space-y-1">
                  {asi1Enhancement.medicalInsights.map((insight, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Trial Results */}
      {allTrials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Clinical Trial Matches</CardTitle>
            <CardDescription>
              {realTimeTrials.length > 0
                ? "Real-time data from ClinicalTrials.gov enhanced with ASI1 analysis"
                : "Saved clinical trials from previous searches"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="detailed">Detailed Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4">
                  {allTrials.slice(0, 3).map((trial, index) => (
                    <Card
                      key={trial.nctId || index}
                      className="border-l-4 border-l-blue-500"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">
                              {trial.title}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {trial.sponsor} • Phase {trial.phase}
                              {trial.nctId && trial.nctId.startsWith("NCT") && (
                                <>
                                  {" • "}
                                  <a
                                    href={`https://clinicaltrials.gov/study/${trial.nctId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#0066CC] hover:underline inline-flex items-center"
                                  >
                                    {trial.nctId}
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                  </a>
                                </>
                              )}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                trial.status === "recruiting"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {trial.status}
                            </Badge>
                            {trial.relevanceScore && (
                              <Badge variant="outline">
                                {Math.round(trial.relevanceScore)}% match
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {trial.description}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">
                            {trial.conditions
                              .slice(0, 3)
                              .map((condition, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {condition}
                                </Badge>
                              ))}
                            {trial.conditions.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{trial.conditions.length - 3} more
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {(() => {
                              const matchId = getTrialMatchId(trial);
                              const status = getTrialMatchStatus(trial);

                              if (matchId) {
                                if (status === "approved") {
                                  return (
                                    <Badge
                                      variant="default"
                                      className="bg-green-100 text-green-800 border-green-200"
                                    >
                                      <Check className="h-3 w-3 mr-1" />
                                      {isPatientView
                                        ? "Consent Signed"
                                        : "Approved"}
                                    </Badge>
                                  );
                                } else if (status === "declined") {
                                  return (
                                    <Badge
                                      variant="destructive"
                                      className="bg-red-100 text-red-800 border-red-200"
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      {isPatientView
                                        ? "Consent Declined"
                                        : "Declined"}
                                    </Badge>
                                  );
                                } else if (status === "enrolled") {
                                  return (
                                    <Badge
                                      variant="default"
                                      className="bg-blue-100 text-blue-800 border-blue-200"
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Enrolled
                                    </Badge>
                                  );
                                } else {
                                  // Show different UI for patients vs doctors
                                  if (isPatientView) {
                                    return (
                                      <Badge
                                        variant="outline"
                                        className="bg-yellow-50 text-yellow-800 border-yellow-200"
                                      >
                                        <Clock className="h-3 w-3 mr-1" />
                                        Pending Review
                                      </Badge>
                                    );
                                  } else {
                                    return (
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="default"
                                          className="h-7 px-2 bg-green-600 hover:bg-green-700"
                                          onClick={() =>
                                            handleApproveTrial(matchId)
                                          }
                                        >
                                          <Check className="h-3 w-3 mr-1" />
                                          Approve
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          className="h-7 px-2"
                                          onClick={() =>
                                            handleDenyTrial(matchId)
                                          }
                                        >
                                          <X className="h-3 w-3 mr-1" />
                                          Deny
                                        </Button>
                                      </div>
                                    );
                                  }
                                }
                              } else {
                                return (
                                  <Badge variant="outline" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Not Saved
                                  </Badge>
                                );
                              }
                            })()}

                            <Button variant="outline" size="sm" asChild>
                              <a
                                href={
                                  trial.nctId.startsWith("NCT")
                                    ? `https://clinicaltrials.gov/study/${trial.nctId}`
                                    : trial.sourceUrl
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1"
                              >
                                ClinicalTrials.gov
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="detailed" className="space-y-4">
                {allTrials.map((trial, index) => (
                  <Card key={trial.nctId || index}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {trial.title}
                        <Badge variant="outline">{trial.nctId}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">
                            Trial Information
                          </h4>
                          <ul className="space-y-1 text-sm">
                            <li>
                              <strong>Sponsor:</strong> {trial.sponsor}
                            </li>
                            <li>
                              <strong>Phase:</strong> {trial.phase}
                            </li>
                            <li>
                              <strong>Status:</strong> {trial.status}
                            </li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">Locations</h4>
                          <ul className="space-y-1 text-sm">
                            {trial.locations
                              .slice(0, 3)
                              .map((location, idx) => (
                                <li key={idx}>{location}</li>
                              ))}
                            {trial.locations.length > 3 && (
                              <li className="text-gray-500">
                                +{trial.locations.length - 3} more locations
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Description</h4>
                        <p className="text-sm text-gray-600">
                          {trial.description}
                        </p>
                      </div>

                      {trial.asi1Analysis && (
                        <Alert>
                          <Brain className="h-4 w-4" />
                          <AlertTitle>ASI1 Analysis</AlertTitle>
                          <AlertDescription className="mt-2">
                            <p className="mb-2">
                              {trial.asi1Analysis.reasoning}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                              {trial.asi1Analysis.benefits.length > 0 && (
                                <div>
                                  <h5 className="font-medium text-green-700 mb-1">
                                    Benefits
                                  </h5>
                                  <ul className="text-sm space-y-1">
                                    {trial.asi1Analysis.benefits.map(
                                      (benefit, idx) => (
                                        <li
                                          key={idx}
                                          className="flex items-start gap-1"
                                        >
                                          <CheckCircle className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                                          {benefit}
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}

                              {trial.asi1Analysis.risks.length > 0 && (
                                <div>
                                  <h5 className="font-medium text-red-700 mb-1">
                                    Risks
                                  </h5>
                                  <ul className="text-sm space-y-1">
                                    {trial.asi1Analysis.risks.map(
                                      (risk, idx) => (
                                        <li
                                          key={idx}
                                          className="flex items-start gap-1"
                                        >
                                          <AlertCircle className="h-3 w-3 text-red-600 mt-0.5 flex-shrink-0" />
                                          {risk}
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Patient Consent Form - Show when doctor approved and user is patient */}
                      {(() => {
                        const matchId = getTrialMatchId(trial);
                        const status = getTrialMatchStatus(trial);

                        if (isPatientView && matchId && status === "approved") {
                          return (
                            <Alert className="border-green-200 bg-green-50">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <AlertTitle className="text-green-800">
                                Trial Approved by Your Doctor
                              </AlertTitle>
                              <AlertDescription className="mt-2">
                                <p className="text-green-700 mb-4">
                                  Your doctor has reviewed and approved this
                                  clinical trial for you. You can now sign the
                                  consent form to participate.
                                </p>
                                <div className="flex gap-2">
                                  <Button
                                    variant="default"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleSignConsent(matchId)}
                                  >
                                    <Check className="h-4 w-4 mr-2" />
                                    Sign Consent Form
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() =>
                                      handleDeclineConsent(matchId)
                                    }
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Decline Participation
                                  </Button>
                                </div>
                              </AlertDescription>
                            </Alert>
                          );
                        }
                        return null;
                      })()}

                      {/* Doctor/Patient Actions */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const matchId = getTrialMatchId(trial);
                            const status = getTrialMatchStatus(trial);

                            if (matchId) {
                              if (status === "approved") {
                                return (
                                  <Badge
                                    variant="default"
                                    className="bg-green-100 text-green-800 border-green-200"
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    {isPatientView
                                      ? "Consent Signed"
                                      : "Approved by Doctor"}
                                  </Badge>
                                );
                              } else if (status === "declined") {
                                return (
                                  <Badge
                                    variant="destructive"
                                    className="bg-red-100 text-red-800 border-red-200"
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    {isPatientView
                                      ? "Consent Declined"
                                      : "Declined by Doctor"}
                                  </Badge>
                                );
                              } else if (status === "enrolled") {
                                return (
                                  <Badge
                                    variant="default"
                                    className="bg-blue-100 text-blue-800 border-blue-200"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Patient Enrolled
                                  </Badge>
                                );
                              } else {
                                // Show different actions for patients vs doctors
                                if (isPatientView) {
                                  return (
                                    <div className="flex flex-col gap-2">
                                      <Badge
                                        variant="outline"
                                        className="bg-yellow-50 text-yellow-800 border-yellow-200"
                                      >
                                        <Clock className="h-4 w-4 mr-1" />
                                        Pending Doctor Review
                                      </Badge>
                                      <p className="text-sm text-gray-600">
                                        Your doctor needs to review this trial
                                        before you can sign consent.
                                      </p>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div className="flex gap-2">
                                      <Button
                                        variant="default"
                                        className="bg-green-600 hover:bg-green-700"
                                        onClick={() =>
                                          handleApproveTrial(matchId)
                                        }
                                      >
                                        <Check className="h-4 w-4 mr-2" />
                                        Approve Trial
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        onClick={() => handleDenyTrial(matchId)}
                                      >
                                        <X className="h-4 w-4 mr-2" />
                                        Decline Trial
                                      </Button>
                                    </div>
                                  );
                                }
                              }
                            } else {
                              return (
                                <Badge variant="outline">
                                  <Clock className="h-4 w-4 mr-1" />
                                  Save trial first to approve/decline
                                </Badge>
                              );
                            }
                          })()}
                        </div>

                        <Button variant="outline" asChild>
                          <a
                            href={
                              trial.nctId.startsWith("NCT")
                                ? `https://clinicaltrials.gov/study/${trial.nctId}`
                                : trial.sourceUrl
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2"
                          >
                            View on ClinicalTrials.gov
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* No results message */}
      {!isSearching && allTrials.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Trials Available</h3>
            <p className="text-gray-600 mb-4">
              No clinical trials found for this consultation. Search for
              real-time trials to find matching studies.
            </p>
            <Button
              onClick={handleSearchRealTimeTrials}
              variant="outline"
              disabled={
                !consultation?.structuredData && !consultation?.transcription
              }
            >
              Search for Trials
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ASI1TrialMatching;
