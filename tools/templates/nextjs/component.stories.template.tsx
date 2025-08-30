import type { Meta, StoryObj } from '@storybook/react';
import { {{NAME_PASCAL}} } from './{{NAME_KEBAB}}';

/**
 * {{NAME_PASCAL}} Storybook Stories
 * Generated on {{DATE}}
 */
const meta: Meta<typeof {{NAME_PASCAL}}> = {
  title: 'Components/{{NAME_PASCAL}}',
  component: {{NAME_PASCAL}},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'secondary', 'outline'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: '{{NAME_PASCAL}} Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary {{NAME_PASCAL}}',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline {{NAME_PASCAL}}',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small {{NAME_PASCAL}}',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large {{NAME_PASCAL}}',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled {{NAME_PASCAL}}',
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    children: 'Loading {{NAME_PASCAL}}',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <{{NAME_PASCAL}} variant="default">Default</{{NAME_PASCAL}}>
        <{{NAME_PASCAL}} variant="secondary">Secondary</{{NAME_PASCAL}}>
        <{{NAME_PASCAL}} variant="outline">Outline</{{NAME_PASCAL}}>
      </div>
      <div className="flex gap-2">
        <{{NAME_PASCAL}} size="sm">Small</{{NAME_PASCAL}}>
        <{{NAME_PASCAL}} size="md">Medium</{{NAME_PASCAL}}>
        <{{NAME_PASCAL}} size="lg">Large</{{NAME_PASCAL}}>
      </div>
      <div className="flex gap-2">
        <{{NAME_PASCAL}} disabled>Disabled</{{NAME_PASCAL}}>
        <{{NAME_PASCAL}} loading>Loading</{{NAME_PASCAL}}>
      </div>
    </div>
  ),
};