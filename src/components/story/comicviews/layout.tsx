/**
 * Layout components for comic panels
 */

import type { FC, KeyboardEvent, ReactElement, ReactNode } from 'react';
import { CardTitle, CardFooter } from '@/components/ui/card';
import { cloneElement } from 'react';
import { Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';

import { TitleEditor, TooltipButton, ActionButtonProps, ActionButton } from './utils';

/**
 * Props for the PanelHeaderStandard component
 */
export interface PanelHeaderStandardProps {
  title: string;
  icon?: ReactElement;
  isEditingTitle: boolean;
  editingTitleValue: string;
  setEditingTitleValue: (value: string) => void;
  setIsEditingTitle: (isEditing: boolean) => void;
  handleTitleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  handleTitleEditSubmit: () => void;
  defaultTitleValue: string; // Used for cancel/reset
  titleClassName?: string;
  titleEditorSize?: 'small' | 'normal';
  actionIcons?: ReactNode; // For additional icons like Info, Expand/Collapse
}

/**
 * PanelHeaderStandard Component
 * * Handles title display, editing, and optional action icons for panel headers.
 */
export const PanelHeaderStandard: FC<PanelHeaderStandardProps> = ({
  title,
  icon,
  isEditingTitle,
  editingTitleValue,
  setEditingTitleValue,
  setIsEditingTitle,
  handleTitleKeyDown,
  handleTitleEditSubmit,
  defaultTitleValue,
  titleClassName = "text-sm sm:text-base md:text-lg font-semibold text-primary truncate cursor-pointer hover:underline flex-grow",
  titleEditorSize = 'normal',
  actionIcons
}) => {
  return (
    <div className="flex items-start justify-between gap-1 sm:gap-2">
      {isEditingTitle ? (
        <TitleEditor
          isEditing={isEditingTitle}
          value={editingTitleValue}
          onChange={setEditingTitleValue}
          onSubmit={handleTitleEditSubmit}
          onCancel={() => {
            setIsEditingTitle(false);
            setEditingTitleValue(defaultTitleValue);
          }}
          onKeyDown={handleTitleKeyDown}
          size={titleEditorSize}
        />
      ) : (
        <CardTitle 
          className={titleClassName} 
          title={`Click pencil to edit. ${title}`} 
          onClick={() => setIsEditingTitle(true)}
        >
          {icon && cloneElement(icon, { className: `inline-block mr-1 sm:mr-2 ${titleEditorSize === 'small' ? 'h-3 w-3 sm:h-3.5 sm:w-3.5' : 'h-4 w-4 sm:h-5 sm:w-5'} align-text-bottom`})}
          {title}
        </CardTitle>
      )}
      <div className="flex items-center shrink-0">
        {!isEditingTitle && !icon && ( // Show edit icon only if no primary icon implies editability or if explicitly needed
            <TooltipButton
                icon={<Edit3 className={cn("text-muted-foreground", titleEditorSize === 'small' ? 'h-3 w-3' : 'h-3.5 w-3.5 sm:h-4 sm:w-4')} />}
                tooltip="Edit Title"
                onClick={() => setIsEditingTitle(true)}
                className={cn(titleEditorSize === 'small' ? 'h-5 w-5 sm:h-6 sm:w-6' : 'h-6 w-6 sm:h-7 sm:w-7')}
            />
        )}
        {actionIcons}
      </div>
    </div>
  );
};

/**
 * Props for the PanelActionsFooter component
 */
export interface PanelActionsFooterProps {
  actions: ActionButtonProps[];
  className?: string;
}

/**
 * PanelActionsFooter Component
 * * Renders a list of action buttons in a consistent footer layout.
 */
export const PanelActionsFooter: FC<PanelActionsFooterProps> = ({ actions, className }) => {
  return (
    <CardFooter className={cn("p-1.5 sm:p-2 md:p-3 grid gap-1.5 sm:gap-2 border-t mt-auto flex-shrink-0", className)}>
      {actions.map(actionProps => (
        <ActionButton {...actionProps} key={actionProps.label || actionProps.tooltip} />
      ))}
    </CardFooter>
  );
}; 