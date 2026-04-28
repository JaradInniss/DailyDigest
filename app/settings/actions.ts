'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function toggleCategory(id: string, value: boolean) {
  const { error } = await supabaseAdmin
    .from('categories')
    .update({ is_selected: value })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed: ${error.message}`);
  }

  revalidatePath('/settings');
}

export async function setAllCategories(value: boolean) {
  // Get all category IDs first
  const { data: allCategories, error: fetchError } = await supabaseAdmin
    .from('categories')
    .select('id');

  if (fetchError) {
    throw new Error(`Fetch error: ${fetchError.message}`);
  }

  // Update each category sequentially to ensure proper execution
  if (allCategories && allCategories.length > 0) {
    for (const cat of allCategories) {
      const { error: updateError } = await supabaseAdmin
        .from('categories')
        .update({ is_selected: value })
        .eq('id', cat.id);

      if (updateError) {
        throw new Error(`Update failed: ${updateError.message}`);
      }
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
