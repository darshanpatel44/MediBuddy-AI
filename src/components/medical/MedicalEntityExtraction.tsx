import { useState, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Heart,
  Pill,
  AlertTriangle,
  Zap,
  Shield,
  Plus,
  RefreshCw,
  Loader2,
  Activity,
  TestTube,
  Eye,
  List,
  Grid3X3,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface MedicalEntityExtractionProps {
  consultationId: Id<"consultations">;
}

interface ExtractedEntity {
  conditions: Array<{
    name: string;
    severity: "mild" | "moderate" | "severe";
    status: "active" | "resolved" | "chronic";
  }>;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    route: string;
  }>;
  allergies: Array<{
    allergen: string;
    reaction: string;
    severity: "mild" | "moderate" | "severe";
  }>;
  symptoms: Array<{
    name: string;
    severity: "mild" | "moderate" | "severe";
    duration: string;
    onset: string;
  }>;
  comorbidities: Array<{
    name: string;
    status: "active" | "resolved" | "chronic";
  }>;
  vitals: Record<string, string>;
  labResults: Record<string, string>;
}

const MedicalEntityExtraction = ({
  consultationId,
}: MedicalEntityExtractionProps) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "structured">("structured");
  const [activeCategory, setActiveCategory] = useState<string>("conditions");
  const [isAddEntityOpen, setIsAddEntityOpen] = useState(false);

  // Fetch consultation data
  const consultation = useQuery(api.consultations.get, {
    id: consultationId,
  });

  // Action to extract entities using Gemini
  const extractEntitiesAction = useAction(
    api.medicalEntityExtraction.extractMedicalEntitiesWithGemini
  );

  // Get extracted entities from consultation data
  const extractedEntities = consultation?.geminiExtractedData || null;

  // Extract entities using Gemini
  const handleExtractEntities = async () => {
    if (!consultation?.transcription) {
      toast({
        title: "No Transcription Available",
        description:
          "Please complete the audio recording and transcription first.",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);
    try {
      await extractEntitiesAction({
        consultationId,
      });
      toast({
        title: "Medical Entities Extracted",
        description:
          "AI has successfully identified medical information from the transcription.",
      });
    } catch (error) {
      console.error("Error extracting entities:", error);
      toast({
        title: "Extraction Failed",
        description: "Failed to extract medical entities. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "conditions":
        return <Heart className="h-5 w-5 text-red-600" />;
      case "medications":
        return <Pill className="h-5 w-5 text-blue-600" />;
      case "allergies":
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case "symptoms":
        return <Zap className="h-5 w-5 text-purple-600" />;
      case "comorbidities":
        return <Shield className="h-5 w-5 text-green-600" />;
      case "vitals":
        return <Activity className="h-5 w-5 text-pink-600" />;
      case "labResults":
        return <TestTube className="h-5 w-5 text-indigo-600" />;
      default:
        return <Eye className="h-5 w-5 text-gray-600" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "conditions":
        return "text-red-700 border-red-300 bg-red-50";
      case "medications":
        return "text-blue-700 border-blue-300 bg-blue-50";
      case "allergies":
        return "text-orange-700 border-orange-300 bg-orange-50";
      case "symptoms":
        return "text-purple-700 border-purple-300 bg-purple-50";
      case "comorbidities":
        return "text-green-700 border-green-300 bg-green-50";
      case "vitals":
        return "text-pink-700 border-pink-300 bg-pink-50";
      case "labResults":
        return "text-indigo-700 border-indigo-300 bg-indigo-50";
      default:
        return "text-gray-700 border-gray-300 bg-gray-50";
    }
  };

  const renderListView = () => {
    if (!extractedEntities) return null;

    const categories = [
      {
        key: "conditions",
        label: "Conditions",
        data: extractedEntities.conditions,
      },
      {
        key: "medications",
        label: "Medications",
        data: extractedEntities.medications,
      },
      {
        key: "allergies",
        label: "Allergies",
        data: extractedEntities.allergies,
      },
      { key: "symptoms", label: "Symptoms", data: extractedEntities.symptoms },
      {
        key: "comorbidities",
        label: "Comorbidities",
        data: extractedEntities.comorbidities,
      },
    ];

    return (
      <div className="space-y-6">
        {categories.map((category) => (
          <div key={category.key} className="space-y-3">
            <div className="flex items-center space-x-2">
              {getCategoryIcon(category.key)}
              <h3 className="text-lg font-semibold text-gray-900">
                {category.label}
              </h3>
            </div>
            {category.data.length === 0 ? (
              <p className="text-gray-500 text-sm ml-7">None detected</p>
            ) : (
              <div className="ml-7 space-y-2">
                {category.data.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border border-gray-200 bg-white"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant="secondary"
                        className={`font-medium ${getCategoryColor(category.key)}`}
                      >
                        {item.name || item.allergen}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {item.severity && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-gray-600">
                            Severity:
                          </span>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              item.severity === "severe"
                                ? "bg-red-100 text-red-700 border-red-200"
                                : item.severity === "moderate"
                                  ? "bg-orange-100 text-orange-700 border-orange-200"
                                  : "bg-green-100 text-green-700 border-green-200"
                            }`}
                          >
                            {item.severity}
                          </Badge>
                        </div>
                      )}
                      {item.status && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-gray-600">
                            Status:
                          </span>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              item.status === "active"
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                : item.status === "resolved"
                                  ? "bg-blue-100 text-blue-700 border-blue-200"
                                  : "bg-amber-100 text-amber-700 border-amber-200"
                            }`}
                          >
                            {item.status}
                          </Badge>
                        </div>
                      )}
                      {item.dosage && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-gray-600">
                            Dosage:
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs text-blue-600 border-blue-200"
                          >
                            {item.dosage}
                          </Badge>
                        </div>
                      )}
                      {item.frequency && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-gray-600">
                            Frequency:
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs text-green-600 border-green-200"
                          >
                            {item.frequency}
                          </Badge>
                        </div>
                      )}
                      {item.reaction && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-gray-600">
                            Reaction:
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs text-orange-600 border-orange-200"
                          >
                            {item.reaction}
                          </Badge>
                        </div>
                      )}
                      {item.duration && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-gray-600">
                            Duration:
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs text-purple-600 border-purple-200"
                          >
                            {item.duration}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Vitals and Lab Results */}
        {Object.keys(extractedEntities.vitals).length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              {getCategoryIcon("vitals")}
              <h3 className="text-lg font-semibold text-gray-900">Vitals</h3>
            </div>
            <div className="ml-7 grid grid-cols-2 gap-3">
              {Object.entries(extractedEntities.vitals).map(([key, value]) => (
                <div
                  key={key}
                  className={`p-3 rounded-lg border ${getCategoryColor("vitals")}`}
                >
                  <div className="font-medium capitalize">
                    {key.replace(/([A-Z])/g, " $1")}
                  </div>
                  <div className="text-lg font-bold">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {Object.keys(extractedEntities.labResults).length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              {getCategoryIcon("labResults")}
              <h3 className="text-lg font-semibold text-gray-900">
                Lab Results
              </h3>
            </div>
            <div className="ml-7 space-y-2">
              {Object.entries(extractedEntities.labResults).map(
                ([test, result]) => (
                  <div
                    key={test}
                    className={`p-3 rounded-lg border ${getCategoryColor("labResults")}`}
                  >
                    <div className="font-medium">{test}</div>
                    <div className="text-lg font-bold">{result}</div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderStructuredView = () => {
    if (!extractedEntities) return null;

    const categories = [
      {
        key: "conditions",
        label: "Conditions",
        data: extractedEntities.conditions,
      },
      {
        key: "medications",
        label: "Medications",
        data: extractedEntities.medications,
      },
      {
        key: "allergies",
        label: "Allergies",
        data: extractedEntities.allergies,
      },
      { key: "symptoms", label: "Symptoms", data: extractedEntities.symptoms },
      {
        key: "comorbidities",
        label: "Comorbidities",
        data: extractedEntities.comorbidities,
      },
    ];

    return (
      <div className="space-y-4">
        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category.key}
              variant={activeCategory === category.key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(category.key)}
              className="flex items-center space-x-2"
            >
              {getCategoryIcon(category.key)}
              <span>{category.label}</span>
              <Badge variant="secondary" className="ml-1">
                {category.data.length}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Active Category Content */}
        <div className="min-h-[200px]">
          {categories
            .filter((cat) => cat.key === activeCategory)
            .map((category) => (
              <div key={category.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(category.key)}
                    <h3 className="text-xl font-bold text-gray-900">
                      {category.label}
                    </h3>
                  </div>
                  <Badge variant="outline">
                    {category.data.length}{" "}
                    {category.data.length === 1 ? "item" : "items"}
                  </Badge>
                </div>

                {category.data.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-2">None detected</div>
                    <p className="text-sm text-gray-500">
                      No {category.label.toLowerCase()} were identified in the
                      transcription
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.data.map((item: any, index: number) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg border-2 border-gray-200 bg-white hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Badge
                            variant="secondary"
                            className={`font-semibold text-sm ${getCategoryColor(category.key)}`}
                          >
                            {item.name || item.allergen}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {item.severity && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-gray-600">
                                Severity:
                              </span>
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  item.severity === "severe"
                                    ? "bg-red-100 text-red-700 border-red-200"
                                    : item.severity === "moderate"
                                      ? "bg-orange-100 text-orange-700 border-orange-200"
                                      : "bg-green-100 text-green-700 border-green-200"
                                }`}
                              >
                                {item.severity}
                              </Badge>
                            </div>
                          )}
                          {item.status && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-gray-600">
                                Status:
                              </span>
                              <Badge
                                variant="secondary"
                                className={`text-xs ${
                                  item.status === "active"
                                    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                    : item.status === "resolved"
                                      ? "bg-blue-100 text-blue-700 border-blue-200"
                                      : "bg-amber-100 text-amber-700 border-amber-200"
                                }`}
                              >
                                {item.status}
                              </Badge>
                            </div>
                          )}
                          {item.dosage && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-gray-600">
                                Dosage:
                              </span>
                              <Badge
                                variant="outline"
                                className="text-xs text-blue-600 border-blue-200"
                              >
                                {item.dosage}
                              </Badge>
                            </div>
                          )}
                          {item.frequency && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-gray-600">
                                Frequency:
                              </span>
                              <Badge
                                variant="outline"
                                className="text-xs text-green-600 border-green-200"
                              >
                                {item.frequency}
                              </Badge>
                            </div>
                          )}
                          {item.route && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-gray-600">
                                Route:
                              </span>
                              <Badge
                                variant="outline"
                                className="text-xs text-indigo-600 border-indigo-200"
                              >
                                {item.route}
                              </Badge>
                            </div>
                          )}
                          {item.reaction && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-gray-600">
                                Reaction:
                              </span>
                              <Badge
                                variant="outline"
                                className="text-xs text-orange-600 border-orange-200"
                              >
                                {item.reaction}
                              </Badge>
                            </div>
                          )}
                          {item.duration && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-gray-600">
                                Duration:
                              </span>
                              <Badge
                                variant="outline"
                                className="text-xs text-purple-600 border-purple-200"
                              >
                                {item.duration}
                              </Badge>
                            </div>
                          )}
                          {item.onset && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-gray-600">
                                Onset:
                              </span>
                              <Badge
                                variant="outline"
                                className="text-xs text-pink-600 border-pink-200"
                              >
                                {item.onset}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    );
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Extracted Medical Entities
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              AI-identified medical information from the transcription
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Dialog open={isAddEntityOpen} onOpenChange={setIsAddEntityOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entity
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Medical Entity</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="entity-type">Entity Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select entity type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="condition">Condition</SelectItem>
                        <SelectItem value="medication">Medication</SelectItem>
                        <SelectItem value="allergy">Allergy</SelectItem>
                        <SelectItem value="symptom">Symptom</SelectItem>
                        <SelectItem value="comorbidity">Comorbidity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="entity-name">Name</Label>
                    <Input id="entity-name" placeholder="Enter entity name" />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddEntityOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={() => setIsAddEntityOpen(false)}>
                      Add Entity
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              onClick={handleExtractEntities}
              disabled={isExtracting || !consultation.transcription}
              className="flex items-center"
            >
              {isExtracting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {extractedEntities ? "Re-extract" : "Extract"} Entities
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!consultation.transcription ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No transcription available</p>
            <p className="text-sm text-gray-500">
              Complete the audio recording and transcription to extract medical
              entities
            </p>
          </div>
        ) : !extractedEntities ? (
          <div className="text-center py-8">
            <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">
              No medical entities extracted yet
            </p>
            <p className="text-sm text-gray-500">
              Click "Extract Entities" to analyze the transcription with AI
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* View Mode Toggle */}
            <div className="flex items-center justify-center">
              <Tabs
                value={viewMode}
                onValueChange={(value) =>
                  setViewMode(value as "list" | "structured")
                }
              >
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger
                    value="structured"
                    className="flex items-center space-x-2"
                  >
                    <Grid3X3 className="h-4 w-4" />
                    <span>Structured View</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="list"
                    className="flex items-center space-x-2"
                  >
                    <List className="h-4 w-4" />
                    <span>List View</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Content */}
            {viewMode === "list" ? renderListView() : renderStructuredView()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MedicalEntityExtraction;
