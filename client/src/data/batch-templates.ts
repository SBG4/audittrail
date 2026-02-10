export interface BatchTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  defaults: {
    label: string;
    file_count?: number;
    description?: string;
    file_types?: string;
  };
}

export const BATCH_TEMPLATES: BatchTemplate[] = [
  {
    id: "usb-file-copy",
    name: "USB File Copy",
    icon: "usb",
    description: "Files copied to/from USB storage device",
    defaults: {
      label: "USB File Copy",
      file_types: ".pdf, .docx, .xlsx, .pptx, .txt",
      description: "Files copied to/from USB storage device",
    },
  },
  {
    id: "email-attachments",
    name: "Email Attachments",
    icon: "mail",
    description: "Attachments extracted from email messages",
    defaults: {
      label: "Email Attachments",
      file_types: ".pdf, .docx, .xlsx, .zip, .msg",
      description: "Attachments extracted from email messages",
    },
  },
  {
    id: "network-transfer",
    name: "Network Transfer",
    icon: "network",
    description: "Files transferred via network share or mapped drive",
    defaults: {
      label: "Network File Transfer",
      file_types: ".pdf, .docx, .xlsx, .csv",
      description: "Files transferred via network share or mapped drive",
    },
  },
  {
    id: "print-job",
    name: "Print Job",
    icon: "printer",
    description: "Documents sent to printer",
    defaults: {
      label: "Print Job",
      file_types: ".pdf, .docx",
      description: "Documents sent to printer",
    },
  },
  {
    id: "cloud-upload",
    name: "Cloud Upload",
    icon: "cloud-upload",
    description: "Files uploaded to cloud storage service",
    defaults: {
      label: "Cloud Upload",
      file_types: ".pdf, .docx, .xlsx, .zip",
      description: "Files uploaded to cloud storage service",
    },
  },
  {
    id: "custom",
    name: "Custom",
    icon: "plus",
    description: "Create a custom file batch from scratch",
    defaults: {
      label: "",
      file_types: "",
      description: "",
    },
  },
];
