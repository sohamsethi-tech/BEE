package com.pothole.backend;

import org.springframework.web.bind.annotation.*;

@RestController
public class HelloController {

    @GetMapping("/")
    public String home() {
        return "PotholeScan Backend is running 🚀";
    }
}