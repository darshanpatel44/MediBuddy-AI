import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  RefreshCw,
  Loader2,
  Calendar,
  Stethoscope,
  ClipboardList,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface MedicalReportDisplayProps {
  consultationId: Id<"consultations">;
}

const MedicalReportDisplay = ({
  consultationId,
}: MedicalReportDisplayProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch consultation data to check if transcription exists
  const consultation = useQuery(api.consultations.get, {
    id: consultationId,
  });

  // Fetch existing medical report
  const medicalReport = useQuery(api.medicalReports.getMedicalReport, {
    consultationId,
  });

  // Action to generate medical report
  const generateReport = useAction(api.medicalReports.generateMedicalReport);

  const handleGenerateReport = async () => {
    if (!consultation?.transcription) {
      toast({
        title: "No Transcription Available",
        description:
          "Please complete the audio recording and transcription first.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      await generateReport({ consultationId });
      toast({
        title: "Medical Report Generated",
        description:
          "SOAP format medical report with ICD-10 codes has been created successfully.",
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate medical report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = () => {
    if (!medicalReport?.reportContent) return;

    const blob = new Blob([medicalReport.reportContent], {
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

  const formatReportContent = (content: string) => {
    // Split content into sections based on SOAP format headers
    const sections = content.split(/(?=\*\*[SOAP]|\*\*ICD)/);

    return sections
      .map((section, index) => {
        if (section.trim() === "") return null;

        // More flexible regex to match SOAP sections
        const soapMatch = section.match(/^\*\*([^*]+)\*\*:?\s*([\s\S]*)/);

        if (soapMatch) {
          const headerText = soapMatch[1].trim();
          const sectionContent = soapMatch[2].trim();

          // Determine icon, color, and clean header text based on section
          let icon = null;
          let colorClass = "text-gray-900";
          let borderColor = "border-gray-300";
          let bgColor = "bg-gray-50";
          let cleanHeaderText = headerText;

          if (headerText.includes("S (") || headerText.includes("Subjective")) {
            icon = <Stethoscope className="h-5 w-5 mr-2 text-blue-600" />;
            colorClass = "text-blue-900";
            borderColor = "border-blue-300";
            bgColor = "bg-blue-50";
            cleanHeaderText = "S (Subjective)";
          } else if (
            headerText.includes("O (") ||
            headerText.includes("Objective")
          ) {
            icon = <ClipboardList className="h-5 w-5 mr-2 text-green-600" />;
            colorClass = "text-green-900";
            borderColor = "border-green-300";
            bgColor = "bg-green-50";
            cleanHeaderText = "O (Objective)";
          } else if (
            headerText.includes("A (") ||
            headerText.includes("Assessment")
          ) {
            icon = <AlertCircle className="h-5 w-5 mr-2 text-orange-600" />;
            colorClass = "text-orange-900";
            borderColor = "border-orange-300";
            bgColor = "bg-orange-50";
            cleanHeaderText = "A (Assessment)";
          } else if (
            headerText.includes("P (") ||
            headerText.includes("Plan")
          ) {
            icon = <FileText className="h-5 w-5 mr-2 text-purple-600" />;
            colorClass = "text-purple-900";
            borderColor = "border-purple-300";
            bgColor = "bg-purple-50";
            cleanHeaderText = "P (Plan)";
          } else if (headerText.includes("ICD")) {
            icon = <FileText className="h-5 w-5 mr-2 text-red-600" />;
            colorClass = "text-red-900";
            borderColor = "border-red-300";
            bgColor = "bg-red-50";
            cleanHeaderText = "ICD-10 Codes";
          }

          return (
            <div key={index} className="mb-8">
              <h3
                className={`text-xl font-bold mb-4 flex items-center ${colorClass} border-b-2 ${borderColor} pb-2`}
              >
                {icon}
                {cleanHeaderText}
              </h3>
              <div
                className={`${bgColor} p-6 rounded-lg border-l-4 ${borderColor} shadow-sm`}
              >
                <div className="text-gray-800 leading-relaxed">
                  {sectionContent.split("\n").map((line, lineIndex) => {
                    if (line.trim() === "")
                      return <div key={lineIndex} className="mb-3" />;

                    // Handle bullet points and structured content
                    if (
                      line.trim().startsWith("-") ||
                      line.trim().startsWith("•")
                    ) {
                      return (
                        <div key={lineIndex} className="flex items-start mb-2">
                          <span className="text-gray-600 mr-2 mt-1">•</span>
                          <span className="flex-1">
                            {line.replace(/^[-•]\s*/, "")}
                          </span>
                        </div>
                      );
                    }

                    // Handle ICD codes specially
                    if (
                      cleanHeaderText === "ICD-10 Codes" &&
                      line.includes(" - ")
                    ) {
                      const [code, description] = line.split(" - ");
                      return (
                        <div
                          key={lineIndex}
                          className="mb-3 p-4 bg-white rounded-md border border-red-200 shadow-sm"
                        >
                          <div className="font-mono font-bold text-red-700 text-lg">
                            {code.trim()}
                          </div>
                          <div className="text-gray-700 mt-1">
                            {description.trim()}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <p
                        key={lineIndex}
                        className="mb-3 text-gray-800 leading-relaxed"
                      >
                        {line}
                      </p>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        }

        // Handle any remaining content
        if (section.trim()) {
          return (
            <div key={index} className="mb-4">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {section.trim()}
              </p>
            </div>
          );
        }

        return null;
      })
      .filter(Boolean);
  };

  if (!consultation) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-6 w-6 text-blue-600" />
              <span>Medical Report</span>
            </div>
            <div className="flex items-center space-x-2">
              {medicalReport?.reportContent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadReport}
                  className="flex items-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              )}
              <Button
                onClick={handleGenerateReport}
                disabled={isGenerating || !consultation.transcription}
                className="flex items-center"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {medicalReport?.reportContent ? "Regenerate" : "Generate"}{" "}
                Report
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!consultation.transcription ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No transcription available</p>
              <p className="text-sm text-gray-500">
                Complete the audio recording and transcription to generate a
                medical report
              </p>
            </div>
          ) : !medicalReport?.reportContent ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">
                No medical report generated yet
              </p>
              <p className="text-sm text-gray-500">
                Click "Generate Report" to create a SOAP format medical report
                with ICD-10 codes
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Report Metadata */}
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-md">
                <div className="flex items-center space-x-4">
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-800"
                  >
                    SOAP Format
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800"
                  >
                    ICD-10 Codes Included
                  </Badge>
                </div>
                {medicalReport.generatedAt && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-1" />
                    Generated:{" "}
                    {new Date(medicalReport.generatedAt).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Report Content */}
              <div className="prose max-w-none">
                {formatReportContent(medicalReport.reportContent)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MedicalReportDisplay;
