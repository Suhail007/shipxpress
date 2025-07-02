// Handle place selection with improved logic
autocompleteRef.current.addListener('place_changed', () => {
  console.log('Google Places: place_changed event fired');
  
  try {
    const place = autocompleteRef.current?.getPlace();
    console.log('Google Places: selected place:', place);
    
    // Enhanced place validation - check if we have meaningful data
    if (!place) {
      console.log('No place object returned');
      return;
    }

    // Check for place_id as the most reliable indicator of a valid selection
    if (!place.place_id && !place.address_components && !place.formatted_address) {
      console.log('Invalid place selection - no identifying data');
      return;
    }

    // If we only have name but no address data, try to get more details
    if (place.name && !place.address_components && !place.formatted_address) {
      console.log('Place has name but no address - might be incomplete selection');
      return;
    }

    // Log place object for debugging
    console.log('Place object:', {
      hasComponents: !!place.address_components,
      hasFormatted: !!place.formatted_address,
      hasGeometry: !!place.geometry,
      placeId: place.place_id,
      name: place.name
    });

    // Process the place data if we have valid address information
    if (place && (place.address_components || place.formatted_address)) {
      let street = '';
      let city = '';
      let state = '';
      let zip = '';

      // Use address_components if available for parsing
      if (place.address_components && place.address_components.length > 0) {
        place.address_components.forEach((component) => {
          const types = component.types;
          if (types.includes('street_number')) {
            street = component.long_name + ' ';
          } else if (types.includes('route')) {
            street += component.long_name;
          } else if (types.includes('locality')) {
            city = component.long_name;
          } else if (types.includes('administrative_area_level_1')) {
            state = component.short_name;
          } else if (types.includes('postal_code')) {
            zip = component.long_name;
          }
        });
      } else if (place.formatted_address) {
        // Fallback: parse formatted_address if address_components is not available
        console.log('Using formatted_address fallback:', place.formatted_address);
        const addressParts = place.formatted_address.split(', ');
        if (addressParts.length >= 3) {
          street = addressParts[0] || '';
          city = addressParts[1] || '';
          const stateZip = addressParts[2]?.split(' ');
          state = stateZip?.[0] || '';
          zip = stateZip?.[1] || '';
        }
      }

      // Update form values with proper options to trigger updates
      const streetAddress = street.trim();
      console.log('Setting form values:', { streetAddress, city, state, zip });
      
      // Use setTimeout to ensure proper DOM updates
      setTimeout(() => {
        try {
          form.setValue('deliveryLine1', streetAddress, { 
            shouldValidate: true, 
            shouldDirty: true, 
            shouldTouch: true 
          });
          form.setValue('deliveryCity', city, { 
            shouldValidate: true, 
            shouldDirty: true, 
            shouldTouch: true 
          });
          form.setValue('deliveryState', state, { 
            shouldValidate: true, 
            shouldDirty: true, 
            shouldTouch: true 
          });
          form.setValue('deliveryZip', zip, { 
            shouldValidate: true, 
            shouldDirty: true, 
            shouldTouch: true 
          });

          // Force update the input field value and trigger React events
          if (addressInputRef.current) {
            const input = addressInputRef.current;
            input.value = streetAddress;
            
            // Create and dispatch events to ensure React Hook Form detects changes
            const inputEvent = new Event('input', { bubbles: true });
            const changeEvent = new Event('change', { bubbles: true });
            
            input.dispatchEvent(inputEvent);
            input.dispatchEvent(changeEvent);
          }

          // If we have coordinates, trigger real-time distance calculation
          if (place.geometry && place.geometry.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            calculateRealTimeDistance(lat, lng);
          }

          // Hide the dropdown properly
          const dropdown = document.querySelector('.pac-container');
          if (dropdown && dropdown instanceof HTMLElement) {
            dropdown.style.display = 'none';
          }
          
          // Blur the input to dismiss focus
          if (addressInputRef.current) {
            addressInputRef.current.blur();
          }
        } catch (updateError) {
          console.error('Error updating form values:', updateError);
        }
      }, 50);
    }
  } catch (error) {
    console.error('Error processing place selection:', error);
  }
});