"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, X, Eye, Save, Loader2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";

const amenities = [
  "WiFi",
  "AC",
  "Kitchen",
  "Parking",
  "Laundry",
  "Gym",
  "Pool",
  "Security",
  "Balcony",
  "Garden",
  "Elevator",
  "Furnished",
  "Pet Friendly",
  "Study Area",
];

interface AddListingFormProps {
  initialData?: any;
  mode?: "create" | "edit";
  onSuccess?: () => void;
}

export function AddListingForm({
  initialData,
  mode = "create",
  onSuccess,
}: AddListingFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    propertyType: "apartment", // default to apartment
    price: "",
    address: "",
    city: "Kathmandu",
    state: "Bagmati",
    country: "Nepal",
    bhk: "1", // for apartment
    seater: "1", // for hostel
    bathrooms: "1",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || "",
        description: initialData.description || "",
        propertyType: initialData.property_type || "apartment",
        price: initialData.price_per_month?.toString() || "",
        address: initialData.address || "",
        city: initialData.city || "Kathmandu",
        state: initialData.state || "Bagmati",
        country: initialData.country || "Nepal",
        bhk:
          initialData.property_type === "apartment"
            ? initialData.bedrooms?.toString() || "1"
            : "1",
        seater:
          initialData.property_type === "hostel_bed"
            ? initialData.max_occupants?.toString() || "1"
            : "1",
        bathrooms: initialData.bathrooms?.toString() || "1",
      });
      setPreviewUrls(initialData.images || []);
    }
  }, [initialData]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages((prev) => [...prev, ...files]);

    // Create preview URLs
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrls((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let imageUrls = [...previewUrls];

      // Upload new images if any
      if (images.length > 0) {
        const newImageUrls = await Promise.all(
          images.map(async (image) => {
            const fileExt = image.name.split(".").pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${user?.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from("property-images")
              .upload(filePath, image);

            if (uploadError) throw uploadError;

            const {
              data: { publicUrl },
            } = supabase.storage.from("property-images").getPublicUrl(filePath);

            return publicUrl;
          })
        );
        imageUrls = [...imageUrls, ...newImageUrls];
      }

      const propertyData = {
        host_id: user?.id,
        title: formData.title,
        description: formData.description,
        property_type: formData.propertyType,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        price_per_month: parseFloat(formData.price),
        bedrooms:
          formData.propertyType === "apartment"
            ? parseInt(formData.bhk)
            : undefined,
        max_occupants:
          formData.propertyType === "hostel_bed"
            ? parseInt(formData.seater)
            : undefined,
        bathrooms: parseInt(formData.bathrooms),
        images: imageUrls,
        is_available: true,
      };

      if (mode === "edit" && initialData?.id) {
        const { error } = await supabase
          .from("properties")
          .update(propertyData)
          .eq("id", initialData.id)
          .eq("host_id", user?.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("properties")
          .insert([propertyData]);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description:
          mode === "edit"
            ? "Listing updated successfully!"
            : "Property listed successfully!",
      });

      router.push("/dashboard/listings");
    } catch (error: any) {
      console.error("Error saving listing:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save listing.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {mode === "edit" ? "Edit Listing" : "List Your Space"}
          </h1>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/listings")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <p className="text-gray-600 mb-6">
          {mode === "edit"
            ? "Update your property listing details."
            : "Create a listing to connect with potential tenants."}
        </p>
        <form
          onSubmit={handleSubmit}
          className="space-y-8 bg-white rounded-lg shadow-sm border p-6"
        >
          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="propertyType">Property Type</Label>
                <Select
                  value={formData.propertyType}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, propertyType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="hostel_bed">Hostel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* BHK or Seater Selector */}
            {formData.propertyType === "apartment" && (
              <div className="space-y-2">
                <Label>BHK Type</Label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4].map((bhk) => (
                    <Button
                      key={bhk}
                      type="button"
                      variant={
                        formData.bhk === String(bhk) ? "default" : "outline"
                      }
                      className="w-20"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, bhk: String(bhk) }))
                      }
                    >
                      {bhk} BHK
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {formData.propertyType === "hostel_bed" && (
              <div className="space-y-2">
                <Label>Seater Type</Label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4].map((seater) => (
                    <Button
                      key={seater}
                      type="button"
                      variant={
                        formData.seater === String(seater)
                          ? "default"
                          : "outline"
                      }
                      className="w-20"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          seater: String(seater),
                        }))
                      }
                    >
                      {seater} Seater
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                required
              />
            </div>
          </div>

          {/* Property Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Property Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price per Month (NPR)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, price: e.target.value }))
                  }
                  required
                />
              </div>
              {formData.propertyType === "apartment" && (
                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Bedrooms (BHK)</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    value={formData.bhk}
                    disabled
                  />
                </div>
              )}
              {formData.propertyType === "hostel_bed" && (
                <div className="space-y-2">
                  <Label htmlFor="maxOccupants">Seater</Label>
                  <Input
                    id="maxOccupants"
                    type="number"
                    value={formData.seater}
                    disabled
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  value={formData.bathrooms}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      bathrooms: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Location</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, city: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, state: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      country: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>
          </div>

          {/* Photos */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Photos</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <p className="text-sm text-gray-500">Add more photos</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/listings")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === "edit" ? "Updating..." : "Creating..."}
                </>
              ) : mode === "edit" ? (
                "Update Listing"
              ) : (
                "Create Listing"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
