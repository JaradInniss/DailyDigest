'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';

const MAX_CATEGORIES = 8;

export async function toggleCategory(id: string, value: boolean): Promise<{ error?: string }> {
  if (value) {
    const { count } = await supabaseAdmin
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .eq('is_selected', true);

    if ((count ?? 0) >= MAX_CATEGORIES) {
      return { error: 'limit_reached' };
    }
  }

  const { error } = await supabaseAdmin
    .from('categories')
    .update({ is_selected: value })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed: ${error.message}`);
  }

  revalidatePath('/settings');
  return {};
}

export async function setAllCategories(value: boolean) {
  const { data: allCategories, error: fetchError } = await supabaseAdmin
    .from('categories')
    .select('id, label')
    .order('label');

  if (fetchError) {
    throw new Error(`Fetch error: ${fetchError.message}`);
  }

  const categoriesToUpdate = value
    ? allCategories?.slice(0, MAX_CATEGORIES) ?? []
    : allCategories ?? [];

  for (const cat of categoriesToUpdate) {
    const { error: updateError } = await supabaseAdmin
      .from('categories')
      .update({ is_selected: value })
      .eq('id', cat.id);

    if (updateError) {
      throw new Error(`Update failed: ${updateError.message}`);
    }
  }

  revalidatePath('/settings');
}

export async function getTodayReportId(): Promise<string | null> {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const { data: report, error } = await supabaseAdmin
    .from('reports')
    .select('id')
    .eq('report_date', today)
    .eq('status', 'complete')
    .single();

  if (error || !report) {
    return null;
  }

  return report.id;
}

/**
 * Retrieves the user's timezone setting from the settings table.
 * Returns the timezone string (IANA identifier) or default 'Atlantic/Halifax'.
 */
export async function getUserTimezone(): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('timezone')
    .single();

  if (error || !data) {
    return 'Atlantic/Halifax';
  }

  return data.timezone;
}

/**
 * Updates the user's timezone setting in the settings table.
 */
export async function setUserTimezone(timezone: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('settings')
    .update({ 
      timezone,
      updated_at: new Date().toISOString(),
    })
    .eq('id', (await getSettingsId()) ?? '');

  if (error) {
    throw new Error(`Failed to update timezone: ${error.message}`);
  }

  revalidatePath('/settings');
  redirect('/settings');
}

/**
 * Server action for timezone selection form.
 * Accepts FormData from the settings page timezone selector.
 */
export async function setUserTimezoneAction(formData: FormData): Promise<void> {
  const timezone = formData.get('timezone');
  if (typeof timezone !== 'string' || !timezone) {
    throw new Error('Invalid timezone value');
  }
  return setUserTimezone(timezone);
}

/**
 * Helper to get the settings row ID (single-user app, so just one row).
 */
async function getSettingsId(): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('id')
    .single();

  if (error || !data) {
    return null;
  }

  return data.id;
}
