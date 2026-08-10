// Design system barrel — re-export all UI primitives from one import path.
// Usage: import { Button, Card, Pill, ... } from "@/components/ui"

export { Button } from "./button";
export { Card } from "./card";
export { Pill, getToneClasses, type Tone } from "./pill";
export { StatCard } from "./stat-card";
export { DataTable, type DataTablePagination } from "./data-table";
export { Pagination } from "./pagination";
export { Breadcrumb } from "./breadcrumb";
export { PageTitle } from "./page-title";
export { SectionHeader } from "./section-header";
export { LiveDot } from "./live-dot";
export { Label } from "./label";
export { PhaseTag } from "./phase-tag";
export { Modal, ModalHeader, ModalBody, ModalFooter, SuccessState } from "./modal";
export { SearchInput } from "./search-input";
export { ActionMenu } from "./action-menu";
export { Toggle } from "./toggle";
export { KV } from "./kv";
export { Field } from "./field";
export { TextInput } from "./text-input";
export { TextArea } from "./text-area";
export { Select } from "./select";
export { InfoBox } from "./info-box";
export { FilterPills } from "./filter-pills";
