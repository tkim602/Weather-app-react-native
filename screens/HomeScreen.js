import { View, Text, Image, TextInput, TouchableOpacity, ScrollView } from 'react-native'
import React, { useCallback, useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context';
import { MagnifyingGlassIcon, XMarkIcon } from 'react-native-heroicons/outline'
import { CalendarDaysIcon, MapPinIcon } from 'react-native-heroicons/solid'
import { debounce } from "lodash";
import { theme } from '../theme';
import { fetchLocations, fetchWeatherForecast } from '../api/weather';
import * as Progress from 'react-native-progress';
import { StatusBar } from 'expo-status-bar';
import { getData, storeData } from '../utils/asyncStorage';
import { fetchTimeZone } from '../api/weather'; 


export default function HomeScreen() {
  const [showSearch, toggleSearch] = useState(false);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState({})
  const [isDayTime, setIsDayTime] = useState(true);

  // fetch weather of the location
  const handleSearch = search=>{
    // console.log('value: ',search);
    if(search && search.length>2)
      fetchLocations({cityName: search}).then(data=>{
        // console.log('got locations: ',data);
        setLocations(data);
      })
  }
  // update time and weather for the location
  const handleLocation = loc=>{
    setLoading(true);
    toggleSearch(false);
    setLocations([]);
    fetchWeatherForecast({
      cityName: loc.name,
      days: '7'
    }).then(data=>{
      setLoading(false);
      setWeather(data);
      storeData('city',loc.name); 
      updateTimeOfDay(loc.name); // update the time based on the selected location
    })
  } 

  const updateTimeOfDay = async (cityName) => {
    try {
      // console.log("Fetching timezone for:", cityName); // debug 
      const data = await fetchTimeZone({ cityName });
      // console.log("Fetched timezone data:", data); // response 
  
      if (data && data.location && data.location.localtime) {
        const localTime = data.location.localtime;
        // console.log("Local time:", localTime);
  
        const hour = parseInt(localTime.split(' ')[1].split(':')[0], 10);
        setIsDayTime(hour >= 6 && hour < 18); // 6~18 isDayTime
      } else {
        // console.error("Failed to fetch localtime data:", data);
        throw new Error("Failed to fetch localtime");
      }
    } catch (error) {
      console.error("Error in updateTimeOfDay:", error);
    }
  };
  


  useEffect(()=>{
    fetchMyWeatherData();
  },[]);

  const fetchMyWeatherData = async ()=>{
    let myCity = await getData('city');
    let cityName = 'Atlanta';
    if(myCity){
      cityName = myCity;
    }
    fetchWeatherForecast({
      cityName,
      days: '7'
    }).then(data=>{
      // console.log('got data: ',data.forecast.forecastday);
      console.log('Location: ', data.location);
      setWeather(data);
      setLoading(false);
      updateTimeOfDay(cityName);
    })
    
  }

  const handleTextDebounce = useCallback(debounce(handleSearch, 1200), []);

  const {location, current} = weather;

  return (
    <View className="flex-1 relative">
      <StatusBar style="light" />
      <Image 
        blurRadius={70} 
        source={
          isDayTime
          ? require('../assets/images/day_bg.png')
          : require('../assets/images/night_bg.png')} 
        className="absolute w-full h-full" />
        {
          loading? (
            <View className="flex-1 flex-row justify-center items-center">
              <Progress.CircleSnail thickness={10} size={140} color="#0bb3b2" />
            </View>
          ):(
            <SafeAreaView className="flex flex-1">
              <View style={{height: '7%'}} className="mx-4 relative z-50">
                <View 
                  className="flex-row justify-end items-center rounded-full" 
                  style={{backgroundColor: showSearch? theme.bgWhite(0.2): 'transparent'}}>
                  
                    {
                      showSearch? (
                        <TextInput 
                          onChangeText={handleTextDebounce} 
                          placeholder="Search for a city or airport" 
                          placeholderTextColor={'lightgray'} 
                          className="pl-6 h-10 pb-1 flex-1 text-base text-white" 
                        />
                      ):null
                    }
                    <TouchableOpacity 
                      onPress={()=> toggleSearch(!showSearch)} 
                      className="rounded-full p-3 m-1" 
                      style={{backgroundColor: theme.bgWhite(0.3)}}>
                      {
                        showSearch? (
                          <XMarkIcon size="25" color="white" />
                        ):(
                          <MagnifyingGlassIcon size="25" color="white" />
                        )
                      }
                      
                  </TouchableOpacity>
                </View>
                {
                  locations.length>0 && showSearch?(
                    <View className="absolute w-full bg-gray-300 top-16 rounded-3xl ">
                      {
                        locations.map((loc, index)=>{
                          let showBorder = index+1 != locations.length;
                          let borderClass = showBorder? ' border-b-2 border-b-gray-400':'';

                          const displayCountry = loc.country == 'United States of America' ? 'United States' : loc.country;

                          return (
                            <TouchableOpacity 
                              key={index}
                              onPress={()=> handleLocation(loc)} 
                              className={"flex-row items-center border-0 p-3 px-4 mb-1 "+borderClass}>
                                <MapPinIcon size="20" color="gray" />
                                <Text className="text-black text-lg ml-2">{loc?.name}, {displayCountry}</Text>
                            </TouchableOpacity>
                          )
                        })
                      }
                    </View>
                  ):null
                }
                
              </View>

              <View className="mx-4 flex justify-around flex-1 mb-2">
                <Text className="text-white text-center text-2xl font-bold">
                  {location?.name},{" "}   
                  <Text className="text-lg font-semibold text-gray-300">
                    {location?.region ? location.region : location?.country}</Text>
                </Text>
                <View className="flex-row justify-center">
                  <Image 
                    source={{ uri: `https:${current?.condition?.icon}` }} 
                    className="w-32 h-32"
                    resizeMode='cover' />
                  
                </View>

                <View className="space-y-2">
                    <Text className="text-center font-bold text-white text-6xl ml-5">
                      {current?.temp_c}&#176;
                    </Text>
                    <Text className="text-center text-white text-xl text-center text-gray-300 tracking-widest">
                      {current?.condition?.text}
                    </Text>
                <View className="flex-row justify-center space-x-4">
                  <Text className="text-white text-lg">
                  H: {weather?.forecast?.forecastday[0]?.day?.maxtemp_c}&#176;C
                  </Text>
                  <Text className="text-white text-lg">
                  L: {weather?.forecast?.forecastday[0]?.day?.mintemp_c}&#176;C
                  </Text>    
                </View>
                </View>

                <View className="flex-row justify-between mx-4">
                  <View className="flex-row space-x-2 items-center">
                    <Image source={require('../assets/icons/rain.png')} className="w-7 h-7" />
                    <Text className="text-white font-semibold text-base w-12 text-center">{current?.precip_mm} mm</Text>
                  </View>
                  <View className="flex-row space-x-2 items-center">
                    <Image source={require('../assets/icons/drop.png')} className="w-6 h-6" />
                    <Text className="text-white font-semibold text-base w-12 text-center">{current?.humidity}%</Text>
                  </View>
                  <View className="flex-row space-x-2 items-center">
                    <Image source={require('../assets/icons/sun.png')} className="w-6 h-6" />
                    <Text className="text-white font-semibold text-base w-15 text-center">
                      { weather?.forecast?.forecastday[0]?.astro?.sunrise }
                    </Text>
                  </View>
                  
                </View>
              </View>

              
              <View className="mb-2 space-y-3">
                <View className="flex-row items-center mx-5 space-x-2">
                  <CalendarDaysIcon size="22" color="white" />
                  <Text className="text-white text-base">DAILY FORECAST</Text>
                </View>
                <ScrollView   
                  horizontal
                  contentContainerStyle={{paddingHorizontal: 15}}
                  showsHorizontalScrollIndicator={false}
                >
                  {
                    weather?.forecast?.forecastday?.map((item,index)=>{
                      // console.log('Forecast day item condition:', item.day.condition); // condition object log
                      const date = new Date(item.date);
                      const options = { weekday: 'long' };
                      let dayName = date.toLocaleDateString('en-US', options);
                      dayName = dayName.split(',')[0];

                      const iconUrl = `https:${item.day.condition.icon}`;


                      return (
                        <View 
                          key={index} 
                          className="flex justify-center items-center w-24 rounded-3xl py-3 space-y-1 mr-4" 
                          style={{backgroundColor: theme.bgWhite(0.15)}}
                        >
                          <Image 
                            source={{ uri: iconUrl }}
                              className="w-11 h-11" />
                          <Text className="text-white">{dayName}</Text>
                          <Text className="text-white text-xl font-semibold">
                            {item?.day?.avgtemp_c}&#176;
                          </Text>
                        </View>
                      )
                    })
                  }
                  
                </ScrollView>
              </View>
              
            
            </SafeAreaView>
          )
        }
      
    </View>
  )
}
