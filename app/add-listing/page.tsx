"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  Upload,
  Home,
  MapPin,
  DollarSign,
  Bed,
  Bath,
  Users,
} from "lucide-react";

export default function AddListingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price_per_month: "",
    address: "",
    city: "Kathmandu",
    state: "Bagmati",
    country: "Nepal",
    bedrooms: "",
    bathrooms: "",
    max_occupants: "",
    property_type: "private_room" as const,
    amenities: [] as string[],
    images: [] as File[],
    is_furnished: false,
    is_pet_friendly: false,
    is_smoking_allowed: false,
    minimum_stay_months: 1,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a listing.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Upload images first
      const imageUrls = await Promise.all(
        formData.images.map(async (file) => {
          const fileExt = file.name.split(".").pop();
          const fileName = `${user.id}/${Date.now()}.${fileExt}`;
          const { data, error } = await supabase.storage
            .from("property-images")
            .upload(fileName, file);

          if (error) throw error;

          const {
            data: { publicUrl },
          } = supabase.storage.from("property-images").getPublicUrl(fileName);

          return publicUrl;
        })
      );

      // Create property
      const { data: property, error } = await supabase
        .from("properties")
        .insert({
          host_id: user.id,
          title: formData.title,
          description: formData.description,
          price_per_month: parseInt(formData.price_per_month),
          address: formData.address,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          bedrooms: parseInt(formData.bedrooms),
          bathrooms: parseFloat(formData.bathrooms),
          max_occupants: parseInt(formData.max_occupants),
          property_type: formData.property_type,
          amenities: formData.amenities,
          images: imageUrls,
          is_furnished: formData.is_furnished,
          is_pet_friendly: formData.is_pet_friendly,
          is_smoking_allowed: formData.is_smoking_allowed,
          minimum_stay_months: formData.minimum_stay_months,
          is_available: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your property has been listed successfully.",
      });

      router.push(`/edit-listing/${property.id}`);
    } catch (error: any) {
      console.error("Error creating listing:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to create listing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFormData({
        ...formData,
        images: [...formData.images, ...Array.from(e.target.files)],
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">List Your Space</h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Enter a descriptive title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your space in detail"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price_per_month">Price per month (NPR)</Label>
                  <Input
                    id="price_per_month"
                    type="number"
                    placeholder="Enter price"
                    value={formData.price_per_month}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_per_month: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="Enter address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Bedrooms</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    min="0"
                    value={formData.bedrooms}
                    onChange={(e) =>
                      setFormData({ ...formData, bedrooms: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Bathrooms</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.bathrooms}
                    onChange={(e) =>
                      setFormData({ ...formData, bathrooms: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_occupants">Max Occupants</Label>
                  <Input
                    id="max_occupants"
                    type="number"
                    min="1"
                    value={formData.max_occupants}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_occupants: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Property Type</Label>
                <Tabs
                  defaultValue="private_room"
                  onValueChange={(value) =>
                    setFormData({ ...formData, property_type: value as any })
                  }
                >
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="private_room">Private Room</TabsTrigger>
                    <TabsTrigger value="shared_room">Shared Room</TabsTrigger>
                    <TabsTrigger value="hostel_bed">Hostel Bed</TabsTrigger>
                    <TabsTrigger value="studio">Studio</TabsTrigger>
                    <TabsTrigger value="apartment">Apartment</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_furnished"
                    checked={formData.is_furnished}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_furnished: e.target.checked,
                      })
                    }
                  />
                  <Label htmlFor="is_furnished">Furnished</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_pet_friendly"
                    checked={formData.is_pet_friendly}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_pet_friendly: e.target.checked,
                      })
                    }
                  />
                  <Label htmlFor="is_pet_friendly">Pet Friendly</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_smoking_allowed"
                    checked={formData.is_smoking_allowed}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_smoking_allowed: e.target.checked,
                      })
                    }
                  />
                  <Label htmlFor="is_smoking_allowed">Smoking Allowed</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <input
                    type="file"
                    id="images"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="images"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Click to upload photos
                    </span>
                  </label>
                </div>

                {formData.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {formData.images.map((file, index) => (
                      <div
                        key={index}
                        className="relative aspect-square rounded-lg overflow-hidden"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Listing
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
