-- Update the handle_new_user function to use role from metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insert profile
  insert into public.profiles (id, full_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8))
  );
  
  -- Assign role from metadata, defaulting to 'user' if not provided
  insert into public.user_roles (user_id, role)
  values (
    new.id, 
    coalesce((new.raw_user_meta_data->>'role')::app_role, 'user'::app_role)
  );
  
  return new;
end;
$$;