'use server';

import { revalidatePath } from 'next/cache';
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
  const today = new Date().toISOString().split('T')[0];

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