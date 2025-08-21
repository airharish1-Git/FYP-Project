"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, ArrowLeft, Loader2 } from "lucide-react";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  images: string[];
  host_id: string;
  status: string;
  property_type?: string;
  bathrooms?: number;
  city?: string;
  state?: string;
  country?: string;
}

export default function EditListingPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [property, setProperty] = useState<Property | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [propertyType, setPropertyType] = useState("");

  useEffect(() => {
    setLoading(true); // Always set loading at the start
    setProperty(null); // Reset property state on param change
    const fetchProperty = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false); // Ensure loading is reset
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) {
        setLoading(false); // Ensure loading is reset
        toast({
          title: "Error",
          description: "Failed to fetch property details",
          variant: "destructive",
        });
        return;
      }

      if (data.host_id !== user.id) {
        setLoading(false); // Ensure loading is reset
        toast({
          title: "Error",
          description: "You don't have permission to edit this property",
          variant: "destructive",
        });
        router.push("/dashboard");
        return;
      }

      setProperty(data);
      setTitle(data.title);
      setDescription(data.description);
      setPrice(data.price.toString());
      setLocation(data.location);
      setImages(data.images || []);
      setPropertyType(data.property_type || "");
      setLoading(false); // Set loading false at the end
    };

    fetchProperty();
  }, [params.id, router, toast]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewImages(Array.from(e.target.files));
    }
  };

  const handleRemoveImage = async (index: number) => {
    const updatedImages = [...images];
    updatedImages.splice(index, 1);
    setImages(updatedImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !property) return;

    try {
      setLoading(true);

      // Upload new images
      const newImageUrls = await Promise.all(
        newImages.map(async (file) => {
          const fileExt = file.name.split(".").pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("property-images")
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const {
            data: { publicUrl },
          } = supabase.storage.from("property-images").getPublicUrl(filePath);

          return publicUrl;
        })
      );

      // Update the listing
      const { error: updateError } = await supabase
        .from("properties")
        .update({
          title,
          description,
          price: parseFloat(price),
          location,
          images: [...images, ...newImageUrls],
          property_type: propertyType,
        })
        .eq("id", property.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Property updated successfully!",
      });

      router.push("/dashboard");
    } catch (error) {
      console.error("Error updating listing:", error);
      toast({
        title: "Error",
        description: "Failed to update listing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Edit Listing</h1>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/listings")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <p className="text-muted-foreground mb-6">
            Update your property listing details below.
          </p>
          <div className="bg-card rounded-lg shadow-sm border p-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Basic Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter property title"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="propertyType">Property Type</Label>
                    <Select
                      value={propertyType}
                      onValueChange={setPropertyType}
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
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter property description"
                    required
                    className="min-h-[100px]"
                  />
                </div>
              </div>
              {/* Property Details */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Property Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Price per Month (NPR)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="Enter price"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="bathrooms">Bathrooms</Label>
                    <Input
                      id="bathrooms"
                      type="number"
                      value={property?.bathrooms || 1}
                      disabled
                    />
                  </div>
                </div>
              </div>
              {/* Location */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Location</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="location">Address</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Enter address"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" value={property?.city || ""} disabled />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input id="state" value={property?.state || ""} disabled />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={property?.country || ""}
                      disabled
                    />
                  </div>
                </div>
              </div>
              {/* Photos */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Photos</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative aspect-square">
                      <Image
                        src={image}
                        alt={`Property image ${index + 1}`}
                        fill
                        className="object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <label
                    htmlFor="image-upload"
                    className="aspect-square border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <div className="text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Add Image
                      </span>
                    </div>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard/listings")}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
