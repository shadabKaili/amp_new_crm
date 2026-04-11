const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pdbgzhiftxygnupkhvxb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkYmd6aGlmdHh5Z251cGtodnhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDE3NjI1OSwiZXhwIjoyMDc5NzUyMjU5fQ.Uj2lP66eSbLhzk_ywAqbKCnAJ803QBsreDJ8rjMTyUk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
    console.log('Creating avatars bucket...');
    
    // Create bucket
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('avatars', {
        public: true,
        allowedMimeTypes: ['image/*'],
        fileSizeLimit: 1048576 * 2 // 2MB
    });

    if (bucketError && bucketError.message !== 'Already exists') {
        console.error('Error creating bucket:', bucketError);
    } else {
        console.log('Bucket created or already exists.');
    }

    // Since we are using the service role, we can't easily create SQL policies via JS SDK 
    // without using `rpc` or raw SQL execution if enabled.
    // However, creating the bucket often handles basic public settings if set to public.
    
    // Let's try to run the SQL for policies via a RPC if available, 
    // or just assume the user can apply the migration I created.
    
    console.log('Storage setup complete.');
}

setupStorage();
