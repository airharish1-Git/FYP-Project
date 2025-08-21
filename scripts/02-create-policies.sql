-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Properties policies
CREATE POLICY "Properties are viewable by everyone" ON public.properties
    FOR SELECT USING (true);

CREATE POLICY "Hosts can insert their own properties" ON public.properties
    FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their own properties" ON public.properties
    FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their own properties" ON public.properties
    FOR DELETE USING (auth.uid() = host_id);

-- Reviews policies
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own reviews" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update their own reviews" ON public.reviews
    FOR UPDATE USING (auth.uid() = reviewer_id);

-- Bookings policies
CREATE POLICY "Users can view their own bookings" ON public.bookings
    FOR SELECT USING (auth.uid() = tenant_id OR auth.uid() = host_id);

CREATE POLICY "Users can insert their own bookings" ON public.bookings
    FOR INSERT WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Hosts can update bookings for their properties" ON public.bookings
    FOR UPDATE USING (auth.uid() = host_id OR auth.uid() = tenant_id);

-- Inquiries policies
CREATE POLICY "Users can view their own inquiries" ON public.inquiries
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send inquiries" ON public.inquiries
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Favorites policies
CREATE POLICY "Users can view their own favorites" ON public.favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own favorites" ON public.favorites
    FOR ALL USING (auth.uid() = user_id);
