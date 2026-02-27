import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FormFieldConfig } from 'zod-collection-ui';

interface CollectionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  formConfig: FormFieldConfig[];
  initialValues?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  title?: string;
}

export function CollectionFormDialog({
  open,
  onOpenChange,
  mode,
  formConfig,
  initialValues,
  onSubmit,
  title,
}: CollectionFormDialogProps) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: initialValues ?? {},
  });

  useEffect(() => {
    if (open) {
      reset(mode === 'edit' && initialValues ? initialValues : {});
    }
  }, [open, mode, initialValues, reset]);

  const visibleFields = formConfig.filter(f => !f.hidden);

  const onFormSubmit = async (data: Record<string, any>) => {
    // Convert date strings back to Date objects
    for (const field of formConfig) {
      if (field.type === 'date' && typeof data[field.name] === 'string' && data[field.name]) {
        data[field.name] = new Date(data[field.name]);
      }
    }
    await onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title ?? (mode === 'create' ? 'Create New' : 'Edit')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          {visibleFields.map((field) => (
            <FormField
              key={field.name}
              field={field}
              register={register}
              setValue={setValue}
              watch={watch}
              error={errors[field.name]?.message as string | undefined}
            />
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormField({
  field,
  register,
  setValue,
  watch,
  error,
}: {
  field: FormFieldConfig;
  register: any;
  setValue: any;
  watch: any;
  error?: string;
}) {
  const value = watch(field.name);

  switch (field.type) {
    case 'select':
      return (
        <div className="space-y-1.5">
          <Label>{field.label}{field.required && <span className="text-destructive"> *</span>}</Label>
          <Select
            value={typeof value === 'string' ? value : ''}
            onValueChange={(v) => setValue(field.name, v)}
            disabled={field.disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder ?? `Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    case 'checkbox':
    case 'switch':
      return (
        <div className="flex items-center gap-2 py-2">
          <Checkbox
            checked={!!value}
            onCheckedChange={(checked) => setValue(field.name, checked)}
            disabled={field.disabled}
          />
          <Label>{field.label}</Label>
          {field.helpText && <span className="text-xs text-muted-foreground ml-2">{field.helpText}</span>}
        </div>
      );

    case 'textarea':
      return (
        <div className="space-y-1.5">
          <Label>{field.label}{field.required && <span className="text-destructive"> *</span>}</Label>
          <Textarea
            {...register(field.name, { required: field.required })}
            placeholder={field.placeholder}
            disabled={field.disabled}
            rows={4}
          />
          {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    case 'number':
      return (
        <div className="space-y-1.5">
          <Label>{field.label}{field.required && <span className="text-destructive"> *</span>}</Label>
          <Input
            type="number"
            {...register(field.name, { required: field.required, valueAsNumber: true })}
            placeholder={field.placeholder}
            disabled={field.disabled}
          />
          {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    case 'date':
      return (
        <div className="space-y-1.5">
          <Label>{field.label}{field.required && <span className="text-destructive"> *</span>}</Label>
          <Input
            type="date"
            {...register(field.name, { required: field.required })}
            disabled={field.disabled}
          />
          {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    case 'email':
      return (
        <div className="space-y-1.5">
          <Label>{field.label}{field.required && <span className="text-destructive"> *</span>}</Label>
          <Input
            type="email"
            {...register(field.name, { required: field.required })}
            placeholder={field.placeholder}
            disabled={field.disabled}
          />
          {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    default:
      return (
        <div className="space-y-1.5">
          <Label>{field.label}{field.required && <span className="text-destructive"> *</span>}</Label>
          <Input
            type="text"
            {...register(field.name, { required: field.required })}
            placeholder={field.placeholder}
            disabled={field.disabled}
          />
          {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );
  }
}
