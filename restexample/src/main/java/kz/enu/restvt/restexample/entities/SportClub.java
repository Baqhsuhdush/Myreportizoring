package kz.enu.restvt.restexample.entities;

import javax.swing.*;
import java.util.ArrayList;
import java.util.List;

public class SportClub {
    private String name;
    private int id;
    private final List<Sport> sport ;

    public SportClub(){
        this.sport = new ArrayList<>();
    }

    public SportClub(String name, List <Sport> sport, int id ){
        this.name = name ;
        this.sport = sport;
        this.id = id;
    }

    public String getName() {
        return name;
    }
    public void setName(String name) {
        this.name = name;
    }

    public List<Sport> getSport() {
        return  sport;
    }

    public int getId() {
        return id;
    }
    public void setId(int id) {
        this.id = id;
    }
}
