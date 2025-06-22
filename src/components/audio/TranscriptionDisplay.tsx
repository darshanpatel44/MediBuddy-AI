import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Pill,
  Heart,
  AlertCircle,
  Clock,
  Plus,
  X,
  RefreshCw,
  Microscope,
  Thermometer,
  Activity,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Types for medical entities
interface Condition {
  name: string;
  severity: "mild" | "moderate" | "severe";
}

interface StructuredData {
  conditions: Condition[];
  medications: string[];
  allergies: string[];
  symptoms?: string[];
  labResults?: Record<string, any>;
  comorbidities?: string[];
  vitals?: Record<string, any>;
}

interface TranscriptionDisplayProps {
  audioRecordingId: Id<"audioRecordings">;
  consultationId: Id<"consultations">;
  onEdit?: (transcription: string) => void;
}

const TranscriptionDisplay = ({
  audioRecordingId,
  consultationId,
  onEdit,
}: TranscriptionDisplayProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscription, setEditedTranscription] = useState("");
  const [highlightedText, setHighlightedText] = useState<string | null>(null);

  // State for entity editing
  const [isAddingEntity, setIsAddingEntity] = useState(false);
  const [entityType, setEntityType] = useState<string>("conditions");
  const [entityValue, setEntityValue] = useState<string>("");
  const [entitySeverity, setEntitySeverity] = useState<string>("moderate");
  const [entityKey, setEntityKey] = useState<string>("");
  const [entityValueObj, setEntityValueObj] = useState<string>("");

  // Fetch audio recording data
  const audioRecording = useQuery(api.audio.getAudioRecording, {
    audioRecordingId,
  });

  // Fetch consultation data (includes transcription)
  const consultation = useQuery(api.consultations.get, {
    id: consultationId,
  });

  // Mutation to re-process transcription
  const reprocessTranscription = useMutation(
    api.medicalEntityExtraction.reprocessTranscription
  );

  // Update consultation mutation
  const updateConsultation = useMutation(
    api.consultations.updateStructuredData
  );

  // Set up editable transcription
  useEffect(() => {
    if (consultation?.transcription) {
      setEditedTranscription(consultation.transcription);
      highlightEntitiesInText(
        consultation.transcription,
        consultation.structuredData
      );
    }
  }, [consultation?.transcription, consultation?.structuredData]);

  // Handle transcription edit
  const handleSaveEdit = () => {
    if (onEdit) {
      onEdit(editedTranscription);
    }
    setIsEditing(false);
  };

  // Highlight entities in text
  const highlightEntitiesInText = useCallback(
    (text: string, entities?: StructuredData) => {
      if (!text || !entities) {
        setHighlightedText(null);
        return;
      }

      let highlighted = text;

      // Function to safely escape regex special characters
      const escapeRegExp = (string: string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      };

      // Process each entity type for highlighting
      const processEntities = (
        entityList: string[] | Condition[],
        className: string,
        getEntityName = (entity: any) => entity
      ) => {
        // Sort by length (longest first) to prevent partial matches
        const sortedEntities = [...entityList].sort((a, b) => {
          const nameA = getEntityName(a);
          const nameB = getEntityName(b);
          return nameB.length - nameA.length;
        });

        for (const entity of sortedEntities) {
          const entityName = getEntityName(entity);
          if (!entityName || entityName.length < 3) continue; // Skip very short terms

          const regex = new RegExp(`\\b${escapeRegExp(entityName)}\\b`, "gi");
          highlighted = highlighted.replace(
            regex,
            `<span class="${className}">$&</span>`
          );
        }
      };

      // Process each type of entity
      if (entities.conditions?.length) {
        processEntities(
          entities.conditions,
          "bg-red-100 text-red-800 rounded px-1",
          (condition: Condition) => condition.name
        );
      }

      if (entities.medications?.length) {
        processEntities(
          entities.medications,
          "bg-blue-100 text-blue-800 rounded px-1"
        );
      }

      if (entities.allergies?.length) {
        processEntities(
          entities.allergies,
          "bg-orange-100 text-orange-800 rounded px-1"
        );
      }

      if (entities.symptoms?.length) {
        processEntities(
          entities.symptoms,
          "bg-purple-100 text-purple-800 rounded px-1"
        );
      }

      if (entities.comorbidities?.length) {
        processEntities(
          entities.comorbidities,
          "bg-green-100 text-green-800 rounded px-1"
        );
      }

      setHighlightedText(highlighted);
    },
    []
  );

  // Handler for re-processing transcription
  const handleReprocessTranscription = async () => {
    if (!consultationId) return;

    try {
      await reprocessTranscription({ consultationId });
    } catch (error) {
      console.error("Error reprocessing transcription:", error);
    }
  };

  // Handle adding a new entity
  const handleAddEntity = () => {
    if (!consultationId || !entityType) return;

    const structuredData = {
      ...(consultation?.structuredData || {
        conditions: [],
        medications: [],
        allergies: [],
        symptoms: [],
        comorbidities: [],
        labResults: {},
        vitals: {},
      }),
    };

    // Add entity based on type
    if (entityType === "conditions" && entityValue) {
      structuredData.conditions = [
        ...(structuredData.conditions || []),
        {
          name: entityValue,
          severity: entitySeverity as "mild" | "moderate" | "severe",
        },
      ];
    } else if (
      ["medications", "allergies", "symptoms", "comorbidities"].includes(
        entityType
      ) &&
      entityValue
    ) {
      // @ts-ignore - Dynamic access to structuredData properties
      structuredData[entityType] = [
        ...(structuredData[entityType] || []),
        entityValue,
      ];
    } else if (
      ["labResults", "vitals"].includes(entityType) &&
      entityKey &&
      entityValueObj
    ) {
      // @ts-ignore - Dynamic access to structuredData properties
      structuredData[entityType] = {
        ...(structuredData[entityType] || {}),
        [entityKey]: entityValueObj,
      };
    }

    // Update consultation with new entity
    updateConsultation({
      id: consultationId,
      structuredData,
    });

    // Reset form
    setEntityValue("");
    setEntitySeverity("moderate");
    setEntityKey("");
    setEntityValueObj("");
    setIsAddingEntity(false);
  };

  // Extract all medical entities from consultation data
  const extractedEntities: StructuredData = consultation?.structuredData || {
    conditions: [],
    medications: [],
    allergies: [],
    symptoms: [],
    comorbidities: [],
    labResults: {},
    vitals: {},
  };

  // If data is loading
  if (!audioRecording || !consultation) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    );
  }

  // If transcription is still processing
  if (
    audioRecording.status === "pending" ||
    audioRecording.status === "processing"
  ) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transcription Processing</CardTitle>
          <CardDescription>
            {audioRecording.status === "pending"
              ? "Preparing to transcribe the audio..."
              : "Converting speech to text..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Clock className="h-12 w-12 text-blue-500 mb-2 mx-auto animate-pulse" />
              <p className="text-lg text-gray-700">
                Please wait while we process your recording
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This may take a few minutes depending on the length of the
                recording
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If transcription failed
  if (audioRecording.status === "failed") {
    return (
      <Card className="border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="text-red-700">Transcription Failed</CardTitle>
          <CardDescription className="text-red-600">
            There was an error processing your recording
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="bg-red-50 p-4 rounded-md text-red-700 mb-4">
            {audioRecording.errorDetails ||
              "An unknown error occurred during transcription."}
          </div>
          <Button variant="outline">Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Transcription Display/Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Transcription</span>
            {audioRecording.status === "completed" && (
              <Badge
                variant="outline"
                className="ml-2 bg-green-50 text-green-700"
              >
                Completed
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "Edit the transcription text"
              : "AI-powered speech-to-text transcription with highlighted medical entities"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={editedTranscription}
                onChange={(e) => setEditedTranscription(e.target.value)}
                className="min-h-[300px] resize-none"
              />
              <div className="flex space-x-2 justify-end">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>Save Changes</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-gray-50 p-4 rounded-md min-h-[300px] whitespace-pre-wrap">
                {highlightedText ? (
                  <div dangerouslySetInnerHTML={{ __html: highlightedText }} />
                ) : (
                  consultation?.transcription || "No transcription available"
                )}
              </div>
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  {consultation?.transcription?.length || 0} characters
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={handleReprocessTranscription}
                    disabled={!consultation?.transcription}
                    className="flex items-center"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Re-Analyze
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    Edit Transcription
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TranscriptionDisplay;
