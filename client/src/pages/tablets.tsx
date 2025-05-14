import { useState } from "react";
import { TabletList } from "@/components/tablets/tablet-list";
import { TabletForm } from "@/components/tablets/tablet-form";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Plus, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Tablets() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [fileImport, setFileImport] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileImport(e.target.files[0]);
    }
  };
  
  const handleImport = async () => {
    if (!fileImport) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import",
        variant: "destructive",
      });
      return;
    }
    
    setIsImporting(true);
    
    try {
      const formData = new FormData();
      formData.append("file", fileImport);
      
      const response = await fetch("/api/tablets/import", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Failed to import tablets");
      }
      
      const result = await response.json();
      
      toast({
        title: "Import successful",
        description: `Successfully imported ${result.tablets.length} tablets`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/tablets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      setIsImportDialogOpen(false);
      setFileImport(null);
    } catch (error) {
      console.error("Error importing tablets:", error);
      toast({
        title: "Import failed",
        description: "There was an error importing the tablets",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };
  
  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch("/api/templates/tablets");
      if (!response.ok) throw new Error("Failed to download template");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tablets_template.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Template downloaded",
        description: "The tablet template has been downloaded successfully",
      });
    } catch (error) {
      console.error("Error downloading template:", error);
      toast({
        title: "Download failed",
        description: "There was an error downloading the template",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="md:flex md:items-center md:justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-slate-900">Tablets</h1>
          </div>
          <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
            <Button 
              variant="outline" 
              onClick={() => setIsImportDialogOpen(true)}
              className="flex items-center"
            >
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              className="flex items-center"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Tablet
            </Button>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="py-4">
          <TabletList />
        </div>
      </div>
      
      {/* Add Tablet Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Tablet</DialogTitle>
          </DialogHeader>
          <TabletForm 
            onSuccess={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Tablets</DialogTitle>
          </DialogHeader>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="text-center">
                  <Upload className="h-12 w-12 text-slate-400 mx-auto" />
                  <h3 className="mt-2 text-sm font-medium text-slate-900">Import from CSV</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Upload a CSV file with tablet information
                  </p>
                </div>
                
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <div className="flex text-sm text-slate-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".csv"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      CSV up to 10MB
                    </p>
                    {fileImport && (
                      <p className="text-xs text-green-600 mt-2">
                        Selected: {fileImport.name}
                      </p>
                    )}
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="text-sm font-medium text-primary-600 hover:text-primary-500 flex items-center justify-center"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download template
                </button>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsImportDialogOpen(false);
                      setFileImport(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={!fileImport || isImporting}
                  >
                    {isImporting ? "Importing..." : "Import"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </div>
  );
}
