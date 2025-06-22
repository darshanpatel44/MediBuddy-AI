import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import {
  User,
  Heart,
  Activity,
  Phone,
  MapPin,
  Clock,
  Save,
  Plus,
  X,
  AlertCircle,
} from "lucide-react";

// Dropdown options for medical profile fields
const ETHNICITY_OPTIONS = [
  "Hispanic or Latino",
  "Not Hispanic or Latino",
  "Unknown",
  "Prefer not to answer",
];

const RACE_OPTIONS = [
  "American Indian or Alaska Native",
  "Asian",
  "Black or African American",
  "Native Hawaiian or Other Pacific Islander",
  "White",
  "More than one race",
  "Unknown",
  "Prefer not to answer",
];

const BLOOD_TYPE_OPTIONS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "Unknown",
];

const SMOKING_STATUS_OPTIONS = [
  "Never smoked",
  "Former smoker",
  "Current smoker",
  "Occasional smoker",
];

const ALCOHOL_CONSUMPTION_OPTIONS = [
  "Never",
  "Rarely (less than once a month)",
  "Occasionally (1-3 times a month)",
  "Regularly (1-2 times a week)",
  "Frequently (3-4 times a week)",
  "Daily",
];

const EXERCISE_FREQUENCY_OPTIONS = [
  "Never",
  "Rarely (less than once a week)",
  "1-2 times per week",
  "3-4 times per week",
  "5-6 times per week",
  "Daily",
];

const FUNCTIONAL_STATUS_OPTIONS = [
  "Fully active, able to carry on all pre-disease performance without restriction",
  "Restricted in physically strenuous activity but ambulatory and able to carry out work of a light or sedentary nature",
  "Ambulatory and capable of all selfcare but unable to carry out any work activities",
  "Capable of only limited selfcare, confined to bed or chair more than 50% of waking hours",
  "Completely disabled, cannot carry on any selfcare, totally confined to bed or chair",
];

const INSURANCE_PROVIDERS = [
  "Aetna",
  "Anthem",
  "Blue Cross Blue Shield",
  "Cigna",
  "Humana",
  "Kaiser Permanente",
  "Medicare",
  "Medicaid",
  "UnitedHealth",
  "Other",
  "Uninsured",
];

const RELATIONSHIP_OPTIONS = [
  "Spouse",
  "Parent",
  "Child",
  "Sibling",
  "Friend",
  "Other relative",
  "Other",
];

const TIME_SLOTS = [
  "Early morning (6-9 AM)",
  "Morning (9 AM-12 PM)",
  "Afternoon (12-3 PM)",
  "Late afternoon (3-6 PM)",
  "Evening (6-9 PM)",
  "Weekends only",
];

const COMMON_CONDITIONS = [
  "Diabetes",
  "Hypertension",
  "Heart disease",
  "Cancer",
  "Stroke",
  "Alzheimer's disease",
  "Depression",
  "Anxiety",
  "Arthritis",
  "Asthma",
  "COPD",
  "Kidney disease",
  "Liver disease",
  "Osteoporosis",
  "High cholesterol",
  "Thyroid disorders",
  "Migraine",
  "Fibromyalgia",
  "Epilepsy",
  "Multiple sclerosis",
];

const COMMON_MEDICATIONS = [
  "Metformin (Diabetes)",
  "Lisinopril (Blood pressure)",
  "Atorvastatin (Cholesterol)",
  "Amlodipine (Blood pressure)",
  "Metoprolol (Heart/Blood pressure)",
  "Omeprazole (Acid reflux)",
  "Levothyroxine (Thyroid)",
  "Albuterol (Asthma)",
  "Gabapentin (Nerve pain)",
  "Sertraline (Depression/Anxiety)",
  "Ibuprofen (Pain/Inflammation)",
  "Acetaminophen (Pain/Fever)",
  "Aspirin (Heart/Pain)",
  "Prednisone (Inflammation)",
  "Insulin (Diabetes)",
  "Warfarin (Blood thinner)",
  "Furosemide (Diuretic)",
  "Hydrochlorothiazide (Blood pressure)",
  "Simvastatin (Cholesterol)",
  "Losartan (Blood pressure)",
];

const COMMON_ALLERGIES = [
  "Penicillin",
  "Sulfa drugs",
  "Aspirin",
  "Ibuprofen",
  "Codeine",
  "Morphine",
  "Latex",
  "Shellfish",
  "Nuts (Peanuts)",
  "Nuts (Tree nuts)",
  "Milk/Dairy",
  "Eggs",
  "Wheat/Gluten",
  "Soy",
  "Fish",
  "Pollen",
  "Dust mites",
  "Pet dander",
  "Bee stings",
  "Contrast dye",
];

const COMMON_SYMPTOMS = [
  "Fatigue",
  "Pain",
  "Shortness of breath",
  "Nausea",
  "Headache",
  "Dizziness",
  "Sleep problems",
  "Loss of appetite",
  "Weight loss",
  "Weight gain",
  "Fever",
  "Cough",
  "Chest pain",
  "Joint pain",
];

interface MedicalProfileFormProps {
  onSave?: () => void;
}

export default function MedicalProfileForm({
  onSave,
}: MedicalProfileFormProps) {
  const { user } = useUser();
  const { toast } = useToast();

  const userData = useQuery(
    api.users.getUserByToken,
    user?.id ? { tokenIdentifier: user.id } : "skip"
  );

  const medicalProfile = useQuery(
    api.medicalProfile.getMedicalProfile,
    userData?._id ? { patientId: userData._id } : "skip"
  );

  const completionPercentage = useQuery(
    api.medicalProfile.getProfileCompletionPercentage,
    userData?._id ? { patientId: userData._id } : "skip"
  );

  const updateProfile = useMutation(api.medicalProfile.updateMedicalProfile);
  const updateBasicMedicalInfo = useMutation(api.users.updateBasicMedicalInfo);

  const [formData, setFormData] = useState({
    ethnicity: "",
    race: "",
    height: "",
    weight: "",
    bloodType: "",
    smokingStatus: "",
    alcoholConsumption: "",
    exerciseFrequency: "",
    familyHistory: [] as string[],
    surgicalHistory: [] as string[],
    previousTreatments: [] as string[],
    currentSymptoms: [] as string[],
    functionalStatus: "",
    painLevel: "",
    insuranceProvider: "",
    emergencyContact: {
      name: "",
      relationship: "",
      phone: "",
    },
    willingToTravel: false,
    maxTravelDistance: "",
    availableTimeSlots: [] as string[],
  });

  // Basic medical info state
  const [basicMedicalInfo, setBasicMedicalInfo] = useState({
    conditions: [] as Array<{
      name: string;
      severity: "mild" | "moderate" | "severe";
    }>,
    medications: [] as string[],
    allergies: [] as string[],
  });

  const [newItems, setNewItems] = useState({
    familyHistory: "",
    surgicalHistory: "",
    previousTreatments: "",
    currentSymptoms: "",
    condition: "",
    medication: "",
    allergy: "",
    customCondition: "",
    customMedication: "",
    customAllergy: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  // Load existing profile data
  useEffect(() => {
    if (medicalProfile) {
      setFormData({
        ethnicity: medicalProfile.ethnicity || "",
        race: medicalProfile.race || "",
        height: medicalProfile.height?.toString() || "",
        weight: medicalProfile.weight?.toString() || "",
        bloodType: medicalProfile.bloodType || "",
        smokingStatus: medicalProfile.smokingStatus || "",
        alcoholConsumption: medicalProfile.alcoholConsumption || "",
        exerciseFrequency: medicalProfile.exerciseFrequency || "",
        familyHistory: medicalProfile.familyHistory || [],
        surgicalHistory: medicalProfile.surgicalHistory || [],
        previousTreatments: medicalProfile.previousTreatments || [],
        currentSymptoms: medicalProfile.currentSymptoms || [],
        functionalStatus: medicalProfile.functionalStatus || "",
        painLevel: medicalProfile.painLevel?.toString() || "",
        insuranceProvider: medicalProfile.insuranceProvider || "",
        emergencyContact: medicalProfile.emergencyContact || {
          name: "",
          relationship: "",
          phone: "",
        },
        willingToTravel: medicalProfile.willingToTravel || false,
        maxTravelDistance: medicalProfile.maxTravelDistance?.toString() || "",
        availableTimeSlots: medicalProfile.availableTimeSlots || [],
      });
    }
  }, [medicalProfile]);

  // Load basic medical info from userData
  useEffect(() => {
    if (userData) {
      setBasicMedicalInfo({
        conditions: userData.conditions || [],
        medications: userData.medications || [],
        allergies: userData.allergies || [],
      });
    }
  }, [userData]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEmergencyContactChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [field]: value,
      },
    }));
  };

  const addArrayItem = (field: keyof typeof newItems) => {
    const value = newItems[field].trim();
    if (value) {
      setFormData((prev) => ({
        ...prev,
        [field]: [...prev[field], value],
      }));
      setNewItems((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const removeArrayItem = (field: string, index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_: any, i: number) => i !== index),
    }));
  };

  const handleTimeSlotChange = (timeSlot: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      availableTimeSlots: checked
        ? [...prev.availableTimeSlots, timeSlot]
        : prev.availableTimeSlots.filter((slot) => slot !== timeSlot),
    }));
  };

  // Helper functions for basic medical info
  const addCondition = () => {
    let conditionName = "";
    if (newItems.condition === "custom") {
      conditionName = newItems.customCondition.trim();
    } else {
      conditionName = newItems.condition.trim();
    }

    if (conditionName) {
      setBasicMedicalInfo((prev) => ({
        ...prev,
        conditions: [
          ...prev.conditions,
          { name: conditionName, severity: "mild" },
        ],
      }));
      setNewItems((prev) => ({
        ...prev,
        condition: "",
        customCondition: "",
      }));
    }
  };

  const removeCondition = (index: number) => {
    setBasicMedicalInfo((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };

  const updateConditionSeverity = (
    index: number,
    severity: "mild" | "moderate" | "severe"
  ) => {
    setBasicMedicalInfo((prev) => ({
      ...prev,
      conditions: prev.conditions.map((condition, i) =>
        i === index ? { ...condition, severity } : condition
      ),
    }));
  };

  const addMedication = () => {
    let medicationName = "";
    if (newItems.medication === "custom") {
      medicationName = newItems.customMedication.trim();
    } else {
      medicationName = newItems.medication.trim();
    }

    if (medicationName) {
      setBasicMedicalInfo((prev) => ({
        ...prev,
        medications: [...prev.medications, medicationName],
      }));
      setNewItems((prev) => ({
        ...prev,
        medication: "",
        customMedication: "",
      }));
    }
  };

  const removeMedication = (index: number) => {
    setBasicMedicalInfo((prev) => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index),
    }));
  };

  const addAllergy = () => {
    let allergyName = "";
    if (newItems.allergy === "custom") {
      allergyName = newItems.customAllergy.trim();
    } else {
      allergyName = newItems.allergy.trim();
    }

    if (allergyName) {
      setBasicMedicalInfo((prev) => ({
        ...prev,
        allergies: [...prev.allergies, allergyName],
      }));
      setNewItems((prev) => ({
        ...prev,
        allergy: "",
        customAllergy: "",
      }));
    }
  };

  const removeAllergy = (index: number) => {
    setBasicMedicalInfo((prev) => ({
      ...prev,
      allergies: prev.allergies.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?._id) return;

    setIsLoading(true);
    try {
      // Update basic medical info first
      await updateBasicMedicalInfo({
        patientId: userData._id,
        conditions:
          basicMedicalInfo.conditions.length > 0
            ? basicMedicalInfo.conditions
            : undefined,
        medications:
          basicMedicalInfo.medications.length > 0
            ? basicMedicalInfo.medications
            : undefined,
        allergies:
          basicMedicalInfo.allergies.length > 0
            ? basicMedicalInfo.allergies
            : undefined,
      });

      // Update detailed medical profile
      await updateProfile({
        patientId: userData._id,
        medicalProfile: {
          ethnicity: formData.ethnicity || undefined,
          race: formData.race || undefined,
          height: formData.height ? parseFloat(formData.height) : undefined,
          weight: formData.weight ? parseFloat(formData.weight) : undefined,
          bloodType: formData.bloodType || undefined,
          smokingStatus: formData.smokingStatus || undefined,
          alcoholConsumption: formData.alcoholConsumption || undefined,
          exerciseFrequency: formData.exerciseFrequency || undefined,
          familyHistory: formData.familyHistory,
          surgicalHistory: formData.surgicalHistory,
          previousTreatments: formData.previousTreatments,
          currentSymptoms: formData.currentSymptoms,
          functionalStatus: formData.functionalStatus || undefined,
          painLevel: formData.painLevel
            ? parseInt(formData.painLevel)
            : undefined,
          insuranceProvider: formData.insuranceProvider || undefined,
          emergencyContact:
            formData.emergencyContact.name &&
            formData.emergencyContact.relationship &&
            formData.emergencyContact.phone
              ? formData.emergencyContact
              : undefined,
          willingToTravel: formData.willingToTravel,
          maxTravelDistance: formData.maxTravelDistance
            ? parseFloat(formData.maxTravelDistance)
            : undefined,
          availableTimeSlots: formData.availableTimeSlots,
        },
      });

      toast({
        title: "Profile Updated",
        description: "Your medical profile has been successfully updated.",
      });

      if (onSave) {
        onSave();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update medical profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-[#0066CC]" />
                <span>Medical Profile</span>
              </CardTitle>
              <CardDescription>
                Complete your medical profile for better clinical trial matching
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-[#0066CC]">
                {completionPercentage || 0}%
              </div>
              <div className="text-sm text-[#86868B]">Complete</div>
            </div>
          </div>
          <Progress value={completionPercentage || 0} className="mt-4" />
        </CardHeader>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Demographics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-[#0066CC]" />
              <span>Demographics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ethnicity">Ethnicity</Label>
              <Select
                value={formData.ethnicity}
                onValueChange={(value) => handleInputChange("ethnicity", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select ethnicity" />
                </SelectTrigger>
                <SelectContent>
                  {ETHNICITY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="race">Race</Label>
              <Select
                value={formData.race}
                onValueChange={(value) => handleInputChange("race", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select race" />
                </SelectTrigger>
                <SelectContent>
                  {RACE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Basic Medical Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-[#0066CC]" />
              <span>Basic Medical Information</span>
            </CardTitle>
            <CardDescription>
              Enter your current medical conditions, medications, and allergies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Conditions */}
            <div>
              <Label>Medical Conditions</Label>
              <div className="flex gap-2 mb-3">
                <Select
                  value={newItems.condition}
                  onValueChange={(value) =>
                    setNewItems((prev) => ({
                      ...prev,
                      condition: value,
                    }))
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a medical condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_CONDITIONS.map((condition) => (
                      <SelectItem key={condition} value={condition}>
                        {condition}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Other (Custom)</SelectItem>
                  </SelectContent>
                </Select>
                {newItems.condition === "custom" && (
                  <Input
                    className="flex-1"
                    value={newItems.customCondition || ""}
                    onChange={(e) =>
                      setNewItems((prev) => ({
                        ...prev,
                        customCondition: e.target.value,
                      }))
                    }
                    placeholder="Enter custom condition"
                    onKeyPress={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addCondition())
                    }
                  />
                )}
                <Button type="button" onClick={addCondition} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {basicMedicalInfo.conditions.map((condition, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-red-50 p-2 rounded-lg"
                  >
                    <Badge variant="destructive" className="text-sm">
                      {condition.name}
                    </Badge>
                    <Select
                      value={condition.severity}
                      onValueChange={(value: "mild" | "moderate" | "severe") =>
                        updateConditionSeverity(index, value)
                      }
                    >
                      <SelectTrigger className="w-20 h-6 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mild">Mild</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="severe">Severe</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCondition(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Medications */}
            <div>
              <Label>Current Medications</Label>
              <div className="flex gap-2 mb-3">
                <Select
                  value={newItems.medication}
                  onValueChange={(value) =>
                    setNewItems((prev) => ({
                      ...prev,
                      medication: value,
                    }))
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a medication" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_MEDICATIONS.map((medication) => (
                      <SelectItem key={medication} value={medication}>
                        {medication}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Other (Custom)</SelectItem>
                  </SelectContent>
                </Select>
                {newItems.medication === "custom" && (
                  <Input
                    className="flex-1"
                    value={newItems.customMedication || ""}
                    onChange={(e) =>
                      setNewItems((prev) => ({
                        ...prev,
                        customMedication: e.target.value,
                      }))
                    }
                    placeholder="Enter custom medication"
                    onKeyPress={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addMedication())
                    }
                  />
                )}
                <Button type="button" onClick={addMedication} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {basicMedicalInfo.medications.map((medication, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 bg-blue-50 p-2 rounded-lg"
                  >
                    <Badge className="bg-blue-100 text-blue-800 text-sm">
                      {medication}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMedication(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Allergies */}
            <div>
              <Label>Allergies</Label>
              <div className="flex gap-2 mb-3">
                <Select
                  value={newItems.allergy}
                  onValueChange={(value) =>
                    setNewItems((prev) => ({
                      ...prev,
                      allergy: value,
                    }))
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select an allergy" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_ALLERGIES.map((allergy) => (
                      <SelectItem key={allergy} value={allergy}>
                        {allergy}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Other (Custom)</SelectItem>
                  </SelectContent>
                </Select>
                {newItems.allergy === "custom" && (
                  <Input
                    className="flex-1"
                    value={newItems.customAllergy || ""}
                    onChange={(e) =>
                      setNewItems((prev) => ({
                        ...prev,
                        customAllergy: e.target.value,
                      }))
                    }
                    placeholder="Enter custom allergy"
                    onKeyPress={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addAllergy())
                    }
                  />
                )}
                <Button type="button" onClick={addAllergy} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {basicMedicalInfo.allergies.map((allergy, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 bg-orange-50 p-2 rounded-lg"
                  >
                    <Badge className="bg-orange-100 text-orange-800 text-sm">
                      {allergy}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAllergy(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Physical Characteristics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-[#0066CC]" />
              <span>Physical Characteristics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                value={formData.height}
                onChange={(e) => handleInputChange("height", e.target.value)}
                placeholder="170"
              />
            </div>

            <div>
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                value={formData.weight}
                onChange={(e) => handleInputChange("weight", e.target.value)}
                placeholder="70"
              />
            </div>

            <div>
              <Label htmlFor="bloodType">Blood Type</Label>
              <Select
                value={formData.bloodType}
                onValueChange={(value) => handleInputChange("bloodType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select blood type" />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lifestyle Factors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-[#0066CC]" />
              <span>Lifestyle Factors</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="smokingStatus">Smoking Status</Label>
              <Select
                value={formData.smokingStatus}
                onValueChange={(value) =>
                  handleInputChange("smokingStatus", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select smoking status" />
                </SelectTrigger>
                <SelectContent>
                  {SMOKING_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="alcoholConsumption">Alcohol Consumption</Label>
              <Select
                value={formData.alcoholConsumption}
                onValueChange={(value) =>
                  handleInputChange("alcoholConsumption", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select alcohol consumption" />
                </SelectTrigger>
                <SelectContent>
                  {ALCOHOL_CONSUMPTION_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="exerciseFrequency">Exercise Frequency</Label>
              <Select
                value={formData.exerciseFrequency}
                onValueChange={(value) =>
                  handleInputChange("exerciseFrequency", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select exercise frequency" />
                </SelectTrigger>
                <SelectContent>
                  {EXERCISE_FREQUENCY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Medical History */}
        <Card>
          <CardHeader>
            <CardTitle>Medical History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Family History */}
            <div>
              <Label>Family History</Label>
              <div className="flex space-x-2 mt-2">
                <Select
                  value={newItems.familyHistory}
                  onValueChange={(value) =>
                    setNewItems((prev) => ({ ...prev, familyHistory: value }))
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_CONDITIONS.map((condition) => (
                      <SelectItem key={condition} value={condition}>
                        {condition}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={() => addArrayItem("familyHistory")}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.familyHistory.map((item, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center space-x-1"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => removeArrayItem("familyHistory", index)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Current Symptoms */}
            <div>
              <Label>Current Symptoms</Label>
              <div className="flex space-x-2 mt-2">
                <Select
                  value={newItems.currentSymptoms}
                  onValueChange={(value) =>
                    setNewItems((prev) => ({ ...prev, currentSymptoms: value }))
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select symptom" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_SYMPTOMS.map((symptom) => (
                      <SelectItem key={symptom} value={symptom}>
                        {symptom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={() => addArrayItem("currentSymptoms")}
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.currentSymptoms.map((item, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center space-x-1"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => removeArrayItem("currentSymptoms", index)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Functional Status */}
            <div>
              <Label htmlFor="functionalStatus">Functional Status</Label>
              <Select
                value={formData.functionalStatus}
                onValueChange={(value) =>
                  handleInputChange("functionalStatus", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select functional status" />
                </SelectTrigger>
                <SelectContent>
                  {FUNCTIONAL_STATUS_OPTIONS.map((option, index) => (
                    <SelectItem key={index} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pain Level */}
            <div>
              <Label htmlFor="painLevel">Pain Level (0-10 scale)</Label>
              <Input
                id="painLevel"
                type="number"
                min="0"
                max="10"
                value={formData.painLevel}
                onChange={(e) => handleInputChange("painLevel", e.target.value)}
                placeholder="0"
              />
            </div>
          </CardContent>
        </Card>

        {/* Insurance & Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Phone className="h-5 w-5 text-[#0066CC]" />
              <span>Insurance & Emergency Contact</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="insuranceProvider">Insurance Provider</Label>
              <Select
                value={formData.insuranceProvider}
                onValueChange={(value) =>
                  handleInputChange("insuranceProvider", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select insurance provider" />
                </SelectTrigger>
                <SelectContent>
                  {INSURANCE_PROVIDERS.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {provider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="emergencyName">Emergency Contact Name</Label>
                <Input
                  id="emergencyName"
                  value={formData.emergencyContact.name}
                  onChange={(e) =>
                    handleEmergencyContactChange("name", e.target.value)
                  }
                  placeholder="Full name"
                />
              </div>

              <div>
                <Label htmlFor="emergencyRelationship">Relationship</Label>
                <Select
                  value={formData.emergencyContact.relationship}
                  onValueChange={(value) =>
                    handleEmergencyContactChange("relationship", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="emergencyPhone">Phone Number</Label>
                <Input
                  id="emergencyPhone"
                  type="tel"
                  value={formData.emergencyContact.phone}
                  onChange={(e) =>
                    handleEmergencyContactChange("phone", e.target.value)
                  }
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trial Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-[#0066CC]" />
              <span>Trial Preferences</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="willingToTravel"
                checked={formData.willingToTravel}
                onCheckedChange={(checked) =>
                  handleInputChange("willingToTravel", checked)
                }
              />
              <Label htmlFor="willingToTravel">
                Willing to travel for clinical trials
              </Label>
            </div>

            {formData.willingToTravel && (
              <div>
                <Label htmlFor="maxTravelDistance">
                  Maximum Travel Distance (miles)
                </Label>
                <Input
                  id="maxTravelDistance"
                  type="number"
                  value={formData.maxTravelDistance}
                  onChange={(e) =>
                    handleInputChange("maxTravelDistance", e.target.value)
                  }
                  placeholder="50"
                />
              </div>
            )}

            <div>
              <Label className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Available Time Slots</span>
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {TIME_SLOTS.map((slot) => (
                  <div key={slot} className="flex items-center space-x-2">
                    <Checkbox
                      id={slot}
                      checked={formData.availableTimeSlots.includes(slot)}
                      onCheckedChange={(checked) =>
                        handleTimeSlotChange(slot, checked as boolean)
                      }
                    />
                    <Label htmlFor={slot} className="text-sm">
                      {slot}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Card>
          <CardContent className="pt-6">
            <Button type="submit" className="w-full" disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Saving..." : "Save Medical Profile"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
